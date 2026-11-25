"use client";

import { useActionState, useState, useTransition } from "react";
import { Pencil, RotateCcw, Trash2 } from "lucide-react";
import type { ApplicationFollowUp } from "@/db/schema";
import { saveFollowUpAction, deleteFollowUpAction } from "@/app/follow-up-actions";
import { calendarDate, MAX_FOLLOW_UP_NOTE_LENGTH, type FollowUpState } from "@/lib/follow-up";
import { formatDate } from "@/lib/application-view";

function FollowUpForm({ applicationId, followUp, onDone, onCancel }: { applicationId: number; followUp?: ApplicationFollowUp; onDone: (state: FollowUpState) => void; onCancel: () => void }) {
  const [today] = useState(() => calendarDate());
  const [timeZone] = useState(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [state, action, pending] = useActionState(async (previous: FollowUpState, data: FormData) => {
    try {
      const result = await saveFollowUpAction(applicationId, followUp?.id, previous, data);
      if (result.success) onDone(result);
      return result;
    } catch { return { success: false, message: "La relance n’a pas pu être enregistrée. Réessayez." }; }
  }, { success: false });
  return (
    <form action={action} className="follow-up-form">
      <input type="hidden" name="timeZone" value={timeZone} />
      <label className="form-field"><span>Date de relance *</span><input type="date" name="date" required max={today} defaultValue={followUp?.date ?? today} aria-invalid={!!state.fieldErrors?.date} aria-describedby={state.fieldErrors?.date ? "follow-up-date-error" : undefined} />{state.fieldErrors?.date ? <span id="follow-up-date-error" className="field-error">{state.fieldErrors.date[0]}</span> : null}</label>
      <label className="form-field"><span>Note (facultative)</span><textarea name="note" rows={6} maxLength={MAX_FOLLOW_UP_NOTE_LENGTH} defaultValue={followUp?.note ?? ""} placeholder="Ex. Mail envoyé au recruteur…" aria-invalid={!!state.fieldErrors?.note} /><span className="field-help">Jusqu’à 10 000 caractères.</span>{state.fieldErrors?.note ? <span className="field-error">{state.fieldErrors.note[0]}</span> : null}</label>
      {state.message ? <p role="alert" className="field-error">{state.message}</p> : null}
      <div className="follow-up-form-actions"><button type="button" className="button button-ghost" disabled={pending} onClick={onCancel}>Annuler</button><button type="submit" className="button button-primary" disabled={pending}>{pending ? "Enregistrement…" : "Enregistrer la relance"}</button></div>
    </form>
  );
}

export function FollowUpManager({ applicationId, followUps }: { applicationId: number; followUps: ApplicationFollowUp[] }) {
  const [editing, setEditing] = useState<ApplicationFollowUp | "new" | null>(null);
  const [notice, setNotice] = useState<FollowUpState | null>(null);
  const [pending, startTransition] = useTransition();
  return (
    <section className="follow-ups-block" aria-label="Relances de candidature">
      <div className="follow-ups-heading"><div><h2><RotateCcw size={18} aria-hidden="true" /> Relances</h2><p>{followUps.length ? `${followUps.length} relance${followUps.length > 1 ? "s" : ""} · Dernière le ${formatDate(followUps[0].date)}` : "Aucune relance enregistrée."}</p></div><button type="button" className="button button-secondary" disabled={pending || editing !== null} onClick={() => { setNotice(null); setEditing("new"); }}><RotateCcw size={16} aria-hidden="true" /> Enregistrer une relance</button></div>
      {notice ? <p className={notice.success ? "upload-success" : "upload-error"} role={notice.success ? "status" : "alert"}>{notice.message}</p> : null}
      {editing !== null ? <FollowUpForm key={editing === "new" ? "new" : editing.id} applicationId={applicationId} followUp={editing === "new" ? undefined : editing} onCancel={() => setEditing(null)} onDone={(result) => { setNotice(result); setEditing(null); }} /> : null}
      <ul className="follow-ups-list">
        {followUps.map((item) => (
          <li key={item.id}><div><time dateTime={item.date}>{formatDate(item.date)}</time>{item.note ? <p>{item.note}</p> : null}</div><div className="follow-up-row-actions"><button type="button" className="icon-button" disabled={pending || editing !== null} aria-label={`Modifier la relance du ${formatDate(item.date)}`} onClick={() => { setNotice(null); setEditing(item); }}><Pencil size={16} /></button><button type="button" className="icon-button" disabled={pending || editing !== null} aria-label={`Supprimer la relance du ${formatDate(item.date)}`} onClick={() => {
          if (!window.confirm("Supprimer cette relance ?")) return;
          startTransition(async () => { try { setNotice(await deleteFollowUpAction(applicationId, item.id)); } catch { setNotice({ success: false, message: "La relance n’a pas pu être supprimée. Réessayez." }); } });
        }}><Trash2 size={16} /></button></div></li>
        ))}
      </ul>
    </section>
  );
}
