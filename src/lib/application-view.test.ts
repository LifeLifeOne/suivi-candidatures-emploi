import { describe, expect, it } from "vitest";
import { dashboardCounts, type ApplicationView } from "@/lib/application-view";

function application(status: ApplicationView["status"], id: number): ApplicationView {
  return {
    id,
    company: "Entreprise",
    title: "Poste",
    offerUrl: null,
    location: null,
    cityCode: null,
    latitude: null,
    longitude: null,
    workMode: "unspecified",
    tags: [{ id: 1, name: "DevOps" }],
    applicationDate: "2026-08-31",
    status,
    notes: null,
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("dashboardCounts", () => {
  it("calcule les indicateurs sans compter les dossiers terminés comme actifs", () => {
    const items = [
      application("applied", 1),
      application("waiting", 2),
      application("interview", 3),
      application("offer", 4),
      application("rejected", 5),
      application("withdrawn", 6),
    ];

    expect(dashboardCounts(items)).toEqual({
      total: 6,
      active: 3,
      interview: 1,
      offer: 1,
      rejected: 1,
    });
  });
});
