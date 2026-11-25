import { findQuickFile } from "@/db/repository";
import { readStoredDocument } from "@/lib/document-storage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ fileId: string }> };

function safeAsciiFilename(filename: string) {
  const fallback = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 160);
  return fallback || "document";
}

export async function GET(request: Request, { params }: Props) {
  const { fileId: rawFileId } = await params;
  const fileId = Number(rawFileId);
  if (!Number.isInteger(fileId)) return new Response("Fichier introuvable", { status: 404 });

  const document = findQuickFile(fileId);
  if (!document) return new Response("Fichier introuvable", { status: 404 });

  try {
    const content = await readStoredDocument(document.storedName);
    const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline";
    const asciiName = safeAsciiFilename(document.originalName);
    const encodedName = encodeURIComponent(document.originalName);
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": document.mimeType === "text/plain" ? "text/plain; charset=utf-8" : document.mimeType,
        "Content-Length": String(content.byteLength),
        "Content-Disposition": `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Fichier introuvable", { status: 404 });
  }
}
