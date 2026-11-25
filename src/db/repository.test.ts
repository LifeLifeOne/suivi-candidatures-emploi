import { readdirSync, readFileSync } from "node:fs";
import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  addApplicationDocument,
  createApplication,
  findApplication,
  findApplicationDocument,
  listApplications,
  listApplicationDocuments,
  listStatusHistory,
  listTags,
  listFollowUps,
  saveFollowUp,
  removeFollowUp,
  removeApplication,
  removeApplicationDocument,
  setApplicationStatus,
  updateApplication,
} from "@/db/repository";
import type { AppDatabase } from "@/db/client";

let sqlite: BetterSqlite3.Database;
let testDb: AppDatabase;

const baseInput = {
  company: "Acme",
  title: "Développeur frontend",
  offerUrl: "https://example.com/offre",
  location: "Nantes",
  cityCode: "44109",
  latitude: 47.2382,
  longitude: -1.5603,
  workMode: "hybrid" as const,
  tags: ["DevOps", "Cloud"],
  applicationDate: "2026-08-31",
  status: "applied" as const,
  notes: "À relire",
};

beforeEach(() => {
  sqlite = new BetterSqlite3(":memory:");
  sqlite.pragma("foreign_keys = ON");
  for (const filename of readdirSync("drizzle").filter((name) => name.endsWith(".sql")).sort()) {
    const migration = readFileSync(`drizzle/${filename}`, "utf8")
      .replaceAll("--> statement-breakpoint", "");
    sqlite.exec(migration);
  }
  testDb = drizzle(sqlite) as AppDatabase;
});

afterEach(() => sqlite.close());

describe("repository candidatures", () => {
  it("enregistre plusieurs relances, les modifie sans toucher au statut et protège leur association", () => {
    const created = createApplication(baseInput, testDb);
    const other = createApplication({ ...baseInput, company: "Autre" }, testDb);
    const first = saveFollowUp(created.id, { date: "2026-09-01", note: "Mail" }, undefined, testDb)!;
    const second = saveFollowUp(created.id, { date: "2026-09-03", note: "" }, undefined, testDb)!;
    expect(listFollowUps(created.id, testDb).map(item => item.id)).toEqual([second.id, first.id]);
    expect(listFollowUps(undefined, testDb)).toHaveLength(2);
    expect(saveFollowUp(other.id, { date: "2026-09-04", note: "incorrect" }, first.id, testDb)).toBeUndefined();
    expect(removeFollowUp(other.id, first.id, testDb)).toBe(false);
    expect(saveFollowUp(created.id, { date: "2026-09-05", note: "Appel" }, first.id, testDb)?.note).toBe("Appel");
    expect(findApplication(created.id, testDb)).toMatchObject({ status: "applied", applicationDate: baseInput.applicationDate });
    expect(listStatusHistory(created.id, testDb)).toHaveLength(1);
    expect(removeFollowUp(created.id, second.id, testDb)).toBe(true);
    expect(removeFollowUp(created.id, second.id, testDb)).toBe(false);
    expect(saveFollowUp(999, { date: "2026-09-01", note: "" }, undefined, testDb)).toBeUndefined();
    removeApplication(created.id, testDb);
    expect(listFollowUps(undefined, testDb)).toHaveLength(0);
  });
  it("crée une candidature et son premier événement", () => {
    const created = createApplication(baseInput, testDb);
    expect(findApplication(created.id, testDb)?.company).toBe("Acme");
    expect(findApplication(created.id, testDb)?.tags.map((tag) => tag.name)).toEqual(["Cloud", "DevOps"]);
    expect(listApplications(testDb)).toHaveLength(1);
    expect(listStatusHistory(created.id, testDb)).toMatchObject([
      { fromStatus: null, toStatus: "applied" },
    ]);
  });

  it("historise uniquement les changements réels de statut", () => {
    const created = createApplication(baseInput, testDb);
    expect(setApplicationStatus(created.id, "interview", testDb)).toEqual({ found: true, changed: true });
    expect(setApplicationStatus(created.id, "interview", testDb)).toEqual({ found: true, changed: false });
    expect(listStatusHistory(created.id, testDb)).toHaveLength(2);
  });

  it("met à jour les champs et supprime l’historique en cascade", () => {
    const created = createApplication(baseInput, testDb);
    const updated = updateApplication(created.id, { ...baseInput, company: "Nouvelle Acme", status: "offer" }, testDb);
    expect(updated?.company).toBe("Nouvelle Acme");
    expect(findApplication(created.id, testDb)?.tags).toMatchObject([{ name: "Cloud" }, { name: "DevOps" }]);
    expect(listStatusHistory(created.id, testDb)).toHaveLength(2);

    expect(removeApplication(created.id, testDb)).toBe(true);
    expect(findApplication(created.id, testDb)).toBeUndefined();
    expect(listStatusHistory(created.id, testDb)).toHaveLength(0);
  });

  it("normalise et remplace les tags sans conserver les tags inutilisés", () => {
    const created = createApplication(baseInput, testDb);
    updateApplication(created.id, { ...baseInput, tags: ["devops", "IA"] }, testDb);

    expect(findApplication(created.id, testDb)?.tags.map((tag) => tag.name)).toEqual(["DevOps", "IA"]);
    expect(listTags(testDb).map((tag) => tag.name)).toEqual(["DevOps", "IA"]);
  });

  it("associe les documents à la bonne candidature et les supprime en cascade", () => {
    const created = createApplication(baseInput, testDb);
    const document = addApplicationDocument({
      applicationId: created.id,
      originalName: "lettre-acme.pdf",
      storedName: "00000000-0000-0000-0000-000000000001.pdf",
      mimeType: "application/pdf",
      size: 1234,
    }, testDb);

    expect(listApplicationDocuments(created.id, testDb)).toHaveLength(1);
    expect(findApplicationDocument(created.id, document.id, testDb)?.originalName).toBe("lettre-acme.pdf");
    expect(findApplicationDocument(created.id + 1, document.id, testDb)).toBeUndefined();
    expect(removeApplicationDocument(created.id + 1, document.id, testDb)).toBeUndefined();

    removeApplication(created.id, testDb);
    expect(listApplicationDocuments(created.id, testDb)).toHaveLength(0);
  });
});
