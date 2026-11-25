import { describe, expect, it } from "vitest";
import { buildHistoryEvents, filterHistoryPeriod, groupApplicationHistory, groupHistoryEvents, recentDateRange, validateDateRange } from "@/lib/application-history";
import type { ApplicationView } from "@/lib/application-view";

function application(id: number, applicationDate: string, company = "Entreprise", title = "Poste"): ApplicationView {
  return { id, applicationDate, company, title, status: "applied", workMode: "unspecified", tags: [], offerUrl: null, location: null, cityCode: null, latitude: null, longitude: null, notes: null, createdAt: 0, updatedAt: 0 };
}

describe("périodes de l’historique", () => {
  it("inclut aujourd’hui dans les 30 et 90 jours et traverse les années", () => {
    const today = new Date(2026, 0, 10, 23, 45);
    expect(recentDateRange(30, today)).toEqual({ start: "2025-12-12", end: "2026-01-10" });
    expect(recentDateRange(90, today)).toEqual({ start: "2025-10-13", end: "2026-01-10" });
  });
  it("traverse février bissextile et le changement d’heure en dates calendaires", () => {
    expect(recentDateRange(30, new Date(2024, 2, 1))).toEqual({ start: "2024-02-01", end: "2024-03-01" });
    expect(recentDateRange(30, new Date(2026, 2, 30))).toEqual({ start: "2026-03-01", end: "2026-03-30" });
  });
  it("utilise la date locale du navigateur même si UTC est au lendemain", () => {
    const localToday = new Date("2026-01-11T02:00:00Z");
    const getters = { getFullYear: () => 2026, getMonth: () => 0, getDate: () => 10 };
    Object.assign(localToday, getters);
    expect(recentDateRange(30, localToday).end).toBe("2026-01-10");
  });
  it("valide les dates obligatoires, réelles et ordonnées, y compris une seule journée", () => {
    expect(validateDateRange("", "2026-01-01")).toBeTruthy();
    expect(validateDateRange("2026-02-30", "2026-03-01")).toBeTruthy();
    expect(validateDateRange("2026-02-02", "2026-02-01")).toBeTruthy();
    expect(validateDateRange("2026-02-01", "2026-02-01")).toBeNull();
  });
  it("filtre la date d’envoi avec les deux bornes incluses", () => {
    const items = ["2025-12-31", "2026-01-01", "2026-01-31", "2026-02-01"].map((date, id) => application(id, date));
    expect(filterHistoryPeriod(items, { start: "2026-01-01", end: "2026-01-31" }).map(a => a.id)).toEqual([1, 2]);
    expect(filterHistoryPeriod(items, null)).toEqual(items);
    expect(filterHistoryPeriod(items, { start: "2027-01-01", end: "2027-01-31" })).toEqual([]);
  });
});

describe("frise des candidatures", () => {
  it("inclut une candidature ancienne relancée dans la période et ignore les candidatures filtrées", () => {
    const applications = [application(1, "2026-01-02")];
    const followUps = [{ id: 1, applicationId: 1, date: "2026-09-28", note: "Mail", createdAt: 1, updatedAt: 1 }, { id: 2, applicationId: 2, date: "2026-09-28", note: "Autre", createdAt: 1, updatedAt: 1 }];
    const events = buildHistoryEvents(applications, followUps, { start: "2026-09-28", end: "2026-09-28" });
    expect(events).toMatchObject([{ kind: "followUp", date: "2026-09-28", note: "Mail", application: { id: 1 } }]);
    expect(events).toHaveLength(1);
    const all = buildHistoryEvents(applications, followUps);
    expect(all).toHaveLength(2);
    expect(new Set(all.map(event => event.application.id)).size).toBe(1);
    expect(groupHistoryEvents(all).map(group => group.month)).toEqual(["2026-09", "2026-01"]);
  });
  it("regroupe par mois et jour décroissants puis trie entreprise, titre et identifiant", () => {
    const items = [application(6, "2025-12-31"), application(5, "2026-01-02", "B"), application(4, "2026-01-02", "A", "Z"), application(3, "2026-01-02", "A", "A"), application(2, "2026-01-02", "A", "A"), application(1, "2026-01-01")];
    const groups = groupApplicationHistory(items);
    expect(groups.map(g => g.month)).toEqual(["2026-01", "2025-12"]);
    expect(groups[0].days.map(d => d.date)).toEqual(["2026-01-02", "2026-01-01"]);
    expect(groups[0].days[0].applications.map(a => a.id)).toEqual([2, 3, 4, 5]);
    expect(items[0].id).toBe(6);
    expect(groupApplicationHistory([])).toEqual([]);
  });
});
