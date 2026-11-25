import { describe, expect, it } from "vitest";
import { applicationSchema } from "@/lib/validation";

const validApplication = {
  company: "Acme",
  title: "Développeur frontend",
  offerUrl: "https://example.com/offre",
  location: "Nantes",
  cityCode: "44109",
  latitude: "47.2382",
  longitude: "-1.5603",
  workMode: "hybrid",
  tags: ["DevOps", "Cloud"],
  applicationDate: "2026-08-31",
  status: "applied",
  notes: "Premier échange prévu.",
};

describe("applicationSchema", () => {
  it("accepte une candidature complète", () => {
    expect(applicationSchema.safeParse(validApplication).success).toBe(true);
  });

  it("exige un tag et une suggestion officielle pour une ville renseignée", () => {
    const result = applicationSchema.safeParse({
      ...validApplication,
      tags: [],
      cityCode: "",
      latitude: "",
      longitude: "",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.tags).toBeDefined();
      expect(result.error.flatten().fieldErrors.location).toBeDefined();
    }
  });

  it("refuse les champs obligatoires absents et un lien non HTTP", () => {
    const result = applicationSchema.safeParse({ ...validApplication, company: "", offerUrl: "example.com" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.company).toBeDefined();
      expect(result.error.flatten().fieldErrors.offerUrl).toBeDefined();
    }
  });
});
