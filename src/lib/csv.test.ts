import { describe, expect, it } from "vitest";
import { applicationsToCsv } from "@/lib/csv";
import type { ApplicationView } from "@/lib/application-view";

describe("applicationsToCsv", () => {
  it("produit un CSV français UTF-8 et échappe guillemets et séparateurs", () => {
    const item: ApplicationView = {
      id: 1,
      company: 'Acme; "France"',
      title: "Développeur",
      offerUrl: "https://example.com",
      location: "Paris",
      cityCode: "75056",
      latitude: 48.8566,
      longitude: 2.3522,
      workMode: "hybrid",
      tags: [{ id: 1, name: "DevOps" }, { id: 2, name: "IA" }],
      applicationDate: "2026-08-31",
      status: "interview",
      notes: "Échange RH",
      createdAt: 1,
      updatedAt: 1,
    };

    const csv = applicationsToCsv([item]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain('"Acme; ""France"""');
    expect(csv).toContain('"Entretien"');
    expect(csv).toContain('"DevOps, IA"');
    expect(csv).toContain('"Hybride"');
    expect(csv.endsWith("\r\n")).toBe(true);
  });
});
