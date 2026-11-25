import { describe, expect, it } from "vitest";
import { detectDocumentType, MAX_DOCUMENT_SIZE, validateDocument } from "@/lib/document-storage";

describe("documents de candidature", () => {
  it("détecte les signatures PDF, JPEG et PNG", () => {
    expect(detectDocumentType(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))?.mimeType).toBe("application/pdf");
    expect(detectDocumentType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mimeType).toBe("image/jpeg");
    expect(detectDocumentType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.mimeType).toBe("image/png");
  });

  it("refuse une extension trompeuse", async () => {
    const file = new File([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d])], "lettre.png", {
      type: "image/png",
    });
    const result = await validateDocument(file);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.message).toContain("extension");
  });

  it("refuse les fichiers dépassant 10 Mo avant lecture", async () => {
    const fakeFile = {
      name: "lettre.pdf",
      size: MAX_DOCUMENT_SIZE + 1,
      arrayBuffer: () => Promise.reject(new Error("ne doit pas être lu")),
    } as File;
    const result = await validateDocument(fakeFile);
    expect(result).toEqual({ success: false, message: "Le fichier dépasse la limite de 10 Mo." });
  });
});

describe("fichiers texte", () => {
  it("accepte un TXT UTF-8 uniquement si autorisé", async () => {
    const file = new File(["Idée à garder"], "idee.txt", { type: "text/plain" });
    expect((await validateDocument(file)).success).toBe(false);
    const result = await validateDocument(file, { allowText: true });
    expect(result.success && result.type.mimeType).toBe("text/plain");
  });

  it("refuse un TXT binaire", async () => {
    const file = new File([new Uint8Array([65, 0, 66])], "x.txt");
    expect((await validateDocument(file, { allowText: true })).success).toBe(false);
  });
});
