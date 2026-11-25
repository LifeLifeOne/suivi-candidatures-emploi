"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { Download, FileImage, FileText, Search, StickyNote, Trash2, Upload } from "lucide-react";
import { deleteQuickFileAction, uploadQuickFileAction, type DocumentActionState } from "@/app/actions";
import type { QuickFile } from "@/db/schema";
import { formatDateTime } from "@/lib/application-view";

const INITIAL_STATE: DocumentActionState = { success: false };

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} Ko`;
  return `${(bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 })} Mo`;
}

export function QuickFiles({ files }: { files: QuickFile[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [query, setQuery] = useState("");
  const visibleFiles = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    if (!normalized) return files;
    return files.filter((file) => file.originalName.toLocaleLowerCase("fr").includes(normalized));
  }, [files, query]);
  const [state, formAction, isPending] = useActionState(uploadQuickFileAction, INITIAL_STATE);

  useEffect(() => {
    if (state.success) formRef.current?.reset();
  }, [state.completedAt, state.success]);

  return (
    <section className="quick-files" aria-label="Pense-bêtes">
      <div className="documents-block">
        <div className="documents-heading">
          <div>
            <h2><StickyNote size={18} /> Pense-bêtes &amp; fichiers utiles</h2>
            <p>Idées, infos, captures · PDF, TXT, JPG ou PNG · 10 Mo maximum</p>
          </div>
          <span className="documents-count">{files.length}</span>
        </div>

        <form ref={formRef} action={formAction} className="upload-form">
          <label className="file-picker">
            <Upload size={18} />
            <span>Choisir un fichier</span>
            <input
              name="document"
              type="file"
              accept=".pdf,.txt,.jpg,.jpeg,.png,application/pdf,text/plain,image/jpeg,image/png"
              required
            />
          </label>
          <button type="submit" className="button button-primary" disabled={isPending}>
            {isPending ? "Envoi…" : "Ajouter"}
          </button>
        </form>
        {state.message ? (
          <p className={state.success ? "upload-success" : "upload-error"} role="status">{state.message}</p>
        ) : null}

        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <span className="sr-only">Rechercher un fichier</span>
          <input
            type="search"
            placeholder="Rechercher par nom de fichier…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        {visibleFiles.length === 0 ? (
          <div className="documents-empty">
            <FileText size={22} />
            <span>{files.length === 0 ? "Aucun fichier enregistré." : "Aucun fichier ne correspond à la recherche."}</span>
          </div>
        ) : (
          <ul className="documents-list">
            {visibleFiles.map((file) => {
              const Icon = file.mimeType.startsWith("image/") ? FileImage : FileText;
              return (
                <li key={file.id}>
                  <span className="document-icon"><Icon size={20} /></span>
                  <a className="document-info" href={`/fichiers/${file.id}`} target="_blank" rel="noreferrer">
                    <strong>{file.originalName}</strong>
                    <span>{formatFileSize(file.size)} · {formatDateTime(file.createdAt)}</span>
                  </a>
                  <a href={`/fichiers/${file.id}?download=1`} className="icon-button" aria-label={`Télécharger ${file.originalName}`}>
                    <Download size={17} />
                  </a>
                  <form
                    action={deleteQuickFileAction.bind(null, file.id)}
                    onSubmit={(event) => {
                      if (!window.confirm(`Supprimer « ${file.originalName} » ?`)) event.preventDefault();
                    }}
                  >
                    <button type="submit" className="icon-button document-delete" aria-label={`Supprimer ${file.originalName}`}>
                      <Trash2 size={17} />
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
