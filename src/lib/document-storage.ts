import { randomUUID } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { basename, dirname, extname, join } from "node:path";

export const MAX_DOCUMENT_SIZE = 10 * 1024 * 1024;

export type SupportedDocumentType = {
  extension: ".pdf" | ".jpg" | ".png" | ".txt";
  mimeType: "application/pdf" | "image/jpeg" | "image/png" | "text/plain";
};

export type DocumentValidation =
  | { success: true; bytes: Uint8Array; originalName: string; type: SupportedDocumentType }
  | { success: false; message: string };

function startsWith(bytes: Uint8Array, signature: number[]) {
  return signature.every((value, index) => bytes[index] === value);
}

export function detectDocumentType(bytes: Uint8Array): SupportedDocumentType | undefined {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) {
    return { extension: ".pdf", mimeType: "application/pdf" };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { extension: ".jpg", mimeType: "image/jpeg" };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return { extension: ".png", mimeType: "image/png" };
  }
  return undefined;
}

export async function validateDocument(
  file: File,
  options: { allowText?: boolean } = {},
): Promise<DocumentValidation> {
  if (!file.name || file.size === 0) {
    return { success: false, message: "Sélectionnez un fichier non vide." };
  }
  if (file.size > MAX_DOCUMENT_SIZE) {
    return { success: false, message: "Le fichier dépasse la limite de 10 Mo." };
  }

  const originalName = basename(file.name)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .slice(0, 255);
  const extension = extname(originalName).toLocaleLowerCase("fr");
  const allowedExtensions = [".pdf", ".jpg", ".jpeg", ".png", ...(options.allowText ? [".txt"] : [])];
  if (!allowedExtensions.includes(extension)) {
    return {
      success: false,
      message: options.allowText ? "Formats acceptés : PDF, TXT, JPG, JPEG et PNG." : "Formats acceptés : PDF, JPG, JPEG et PNG.",
    };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (extension === ".txt") {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    } catch {
      return { success: false, message: "Le fichier texte doit être encodé en UTF-8." };
    }
    if (bytes.includes(0)) return { success: false, message: "Le contenu du fichier ne correspond pas à un fichier texte." };
    return { success: true, bytes, originalName, type: { extension: ".txt", mimeType: "text/plain" } };
  }
  const type = detectDocumentType(bytes);
  if (!type) {
    return { success: false, message: "Le contenu du fichier ne correspond pas à un PDF ou une image acceptée." };
  }
  if (type.extension === ".pdf" && extension !== ".pdf") {
    return { success: false, message: "L’extension ne correspond pas au contenu PDF." };
  }
  if (type.extension === ".png" && extension !== ".png") {
    return { success: false, message: "L’extension ne correspond pas au contenu PNG." };
  }
  if (type.extension === ".jpg" && ![".jpg", ".jpeg"].includes(extension)) {
    return { success: false, message: "L’extension ne correspond pas au contenu JPEG." };
  }
  return { success: true, bytes, originalName, type };
}

export function getUploadsDirectory() {
  if (process.env.UPLOAD_DIR) return process.env.UPLOAD_DIR;
  const databasePath = process.env.DB_FILE_NAME ?? "data/jobs.db";
  return join(dirname(databasePath), "uploads");
}

export async function saveDocument(bytes: Uint8Array, extension: SupportedDocumentType["extension"]) {
  const storedName = `${randomUUID()}${extension}`;
  const directory = getUploadsDirectory();
  await mkdir(directory, { recursive: true });
  await writeFile(join(directory, storedName), bytes, { flag: "wx" });
  return storedName;
}

export async function readStoredDocument(storedName: string) {
  if (!/^[a-f0-9-]+\.(pdf|jpg|png|txt)$/i.test(storedName)) throw new Error("Nom de fichier invalide");
  return readFile(join(getUploadsDirectory(), storedName));
}

export async function deleteStoredDocument(storedName: string) {
  if (!/^[a-f0-9-]+\.(pdf|jpg|png|txt)$/i.test(storedName)) return;
  try {
    await unlink(join(getUploadsDirectory(), storedName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}
