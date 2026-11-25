import { describe, expect, it } from "vitest";
import { calendarDate, followUpSchema, MAX_FOLLOW_UP_NOTE_LENGTH } from "@/lib/follow-up";
import { tagColors } from "@/lib/tags";

describe("relances effectuées", () => {
  const schema = followUpSchema("2026-09-28");
  it("accepte aujourd’hui, les dates passées et une note facultative", () => {
    expect(schema.parse({ date: "2026-09-28", note: "" })).toEqual({ date: "2026-09-28", note: "" });
    expect(schema.parse({ date: "2024-02-29", note: "  Mail envoyé  " }).note).toBe("Mail envoyé");
  });
  it("refuse les dates absentes, impossibles, futures et les notes trop longues", () => {
    for (const date of ["", "2026-02-29", "2026-09-31", "2026-09-29", "2026-9-1"]) expect(schema.safeParse({ date, note: "" }).success).toBe(false);
    expect(schema.safeParse({ date: "2026-09-28", note: "x".repeat(MAX_FOLLOW_UP_NOTE_LENGTH) }).success).toBe(true);
    expect(schema.safeParse({ date: "2026-09-28", note: "x".repeat(MAX_FOLLOW_UP_NOTE_LENGTH + 1) }).success).toBe(false);
  });
  it("détermine aujourd’hui dans le fuseau du navigateur", () => {
    const instant = new Date("2026-09-28T23:30:00Z");
    expect(calendarDate(instant, "Europe/Paris")).toBe("2026-09-29");
    expect(calendarDate(instant, "America/New_York")).toBe("2026-09-28");
    expect(() => calendarDate(instant, "invalide")).toThrow();
  });
});

describe("couleurs des tags", () => {
  it("conserve la couleur malgré la casse, les espaces ou les variantes Unicode", () => {
    expect(tagColors(" DevOps ")).toEqual(tagColors("devops"));
    expect(tagColors("ＩＡ")).toEqual(tagColors("IA"));
    expect(tagColors("Cloud   Native")).toEqual(tagColors("cloud native"));
  });
  it("différencie les tags courants", () => {
    const colors = ["DevOps", "Drupal", "IA", "Cloud", "Mobile"].map((name) => tagColors(name).color);
    expect(new Set(colors).size).toBe(colors.length);
  });
});
