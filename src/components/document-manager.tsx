"use client";

import { useActionState, useEffect, useRef } from "react";
import { Download, FileImage, FileText, Paperclip, Trash2, Upload } from "lucide-react";
import {
  deleteApplicationDocumentAction,
  uploadApplicationDocumentAction,
  type DocumentActionState,
} from "@/app/actions";
import type { ApplicationDocument } from "@/db/schema";
import { formatDateTime } from "@/lib/application-view";

const INITIAL_STATE: DocumentActionState = { success: false };

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

export function DocumentManager({
  applicationId,
  documents,
}: {
  applicationId: number;
  documents: ApplicationDocument[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const uploadAction = uploadApplicationDocumentAction.bind(null, applicationId);
  const [state, formAction, isPending] = useActionState(uploadAction, INITIAL_STATE);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.completedAt, state.success]);

  return (
    <section className="documents-block">
      <div className="documents-heading">
        <div>
          <h2><Paperclip size={18} /> Documents</h2>
          <p>Notes, lettres ou captures · PDF, JPG ou PNG · 10 Mo maximum</p>
        </div>
        <span className="documents-count">{documents.length}</span>
      </div>

      <form ref={formRef} action={formAction} className="upload-form">
        <label className="file-picker">
          <Upload size={18} />
          <span>Choisir un fichier</span>
          <input name="document" type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" required />
        </label>
        <button type="submit" className="button button-primary" disabled={isPending}>
          {isPending ? "Envoi…" : "Ajouter"}
        </button>
      </form>
      {state.message ? (
        <p className={state.success ? "upload-success" : "upload-error"} role="status">{state.message}</p>
      ) : null}

      {documents.length === 0 ? (
        <div className="documents-empty">
          <FileText size={22} />
          <span>Aucun document enregistré pour cette candidature.</span>
        </div>
      ) : (
        <ul className="documents-list">
          {documents.map((document) => {
            const Icon = document.mimeType === "application/pdf" ? FileText : FileImage;
            const deleteAction = deleteApplicationDocumentAction.bind(null, applicationId, document.id);
            return (
              <li key={document.id}>
                <span className="document-icon"><Icon size={20} /></span>
                <a
                  className="document-info"
                  href={`/candidatures/${applicationId}/documents/${document.id}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <strong>{document.originalName}</strong>
                  <span>{formatFileSize(document.size)} · {formatDateTime(document.createdAt)}</span>
                </a>
                <a
                  href={`/candidatures/${applicationId}/documents/${document.id}?download=1`}
                  className="icon-button"
                  aria-label={`Télécharger ${document.originalName}`}
                >
                  <Download size={17} />
                </a>
                <form
                  action={deleteAction}
                  onSubmit={(event) => {
                    if (!window.confirm(`Supprimer « ${document.originalName} » ?`)) event.preventDefault();
                  }}
                >
                  <button type="submit" className="icon-button document-delete" aria-label={`Supprimer ${document.originalName}`}>
                    <Trash2 size={17} />
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
