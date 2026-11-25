import { findApplicationDocument } from "@/db/repository";
import { readStoredDocument } from "@/lib/document-storage";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string; documentId: string }> };

function safeAsciiFilename(filename: string) {
  const fallback = filename
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 160);
  return fallback || "document";
}

export async function GET(request: Request, { params }: Props) {
  const { id: rawApplicationId, documentId: rawDocumentId } = await params;
  const applicationId = Number(rawApplicationId);
  const documentId = Number(rawDocumentId);
  if (!Number.isInteger(applicationId) || !Number.isInteger(documentId)) {
    return new Response("Document introuvable", { status: 404 });
  }

  const document = findApplicationDocument(applicationId, documentId);
  if (!document) return new Response("Document introuvable", { status: 404 });

  try {
    const content = await readStoredDocument(document.storedName);
    const disposition = new URL(request.url).searchParams.has("download") ? "attachment" : "inline";
    const asciiName = safeAsciiFilename(document.originalName);
    const encodedName = encodeURIComponent(document.originalName);
    return new Response(new Uint8Array(content), {
      headers: {
        "Content-Type": document.mimeType,
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
