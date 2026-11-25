"use client";

import { useActionState } from "react";
import Link from "next/link";
import { ExternalLink, Save } from "lucide-react";
import { createApplicationAction, updateApplicationAction } from "@/app/actions";
import type { ApplicationView, TagView } from "@/lib/application-view";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/status";
import { INITIAL_ACTION_STATE } from "@/lib/validation";
import { WORK_MODES, WORK_MODE_LABELS } from "@/lib/work-mode";
import { CityAutocomplete } from "@/components/city-autocomplete";
import { TagInput } from "@/components/tag-input";

type Props = {
  application?: ApplicationView;
  defaultDate?: string;
  availableTags: TagView[];
};

export function ApplicationForm({ application, defaultDate, availableTags }: Props) {
  const action = application
    ? updateApplicationAction.bind(null, application.id)
    : createApplicationAction;
  const [state, formAction, isPending] = useActionState(action, INITIAL_ACTION_STATE);

  const values = state.values;

  function errorFor(field: keyof NonNullable<typeof state.fieldErrors>) {
    const message = state.fieldErrors?.[field]?.[0];
    return message ? <span className="field-error">{message}</span> : null;
  }

  function errorMessage(field: keyof NonNullable<typeof state.fieldErrors>) {
    return state.fieldErrors?.[field]?.[0];
  }

  return (
    <form action={formAction} className="application-form" noValidate>
      {state.message ? <div className="form-alert" role="alert">{state.message}</div> : null}

      <div className="form-grid">
        <label className="form-field">
          <span>Entreprise <b>*</b></span>
          <input name="company" defaultValue={values?.company ?? application?.company} required maxLength={120} placeholder="Ex. Acme" />
          {errorFor("company")}
        </label>
        <label className="form-field">
          <span>Intitulé du poste <b>*</b></span>
          <input name="title" defaultValue={values?.title ?? application?.title} required maxLength={160} placeholder="Ex. Développeur frontend" />
          {errorFor("title")}
        </label>
        <CityAutocomplete
          initialCity={
            application?.location && application.cityCode && application.latitude !== null && application.longitude !== null
              ? {
                  name: application.location,
                  code: application.cityCode,
                  latitude: application.latitude,
                  longitude: application.longitude,
                }
              : undefined
          }
          error={errorMessage("location")}
        />
        <label className="form-field">
          <span>Date de candidature <b>*</b></span>
          <input name="applicationDate" type="date" defaultValue={values?.applicationDate ?? application?.applicationDate ?? defaultDate} required />
          {errorFor("applicationDate")}
        </label>
        <label className="form-field">
          <span>Statut <b>*</b></span>
          <select name="status" defaultValue={values?.status ?? application?.status ?? "applied"} required>
            {APPLICATION_STATUSES.map((status) => (
              <option key={status} value={status}>{STATUS_LABELS[status]}</option>
            ))}
          </select>
          {errorFor("status")}
        </label>
        <label className="form-field">
          <span>Mode de travail</span>
          <select name="workMode" defaultValue={values?.workMode ?? application?.workMode ?? "unspecified"}>
            {WORK_MODES.map((mode) => (
              <option key={mode} value={mode}>{WORK_MODE_LABELS[mode]}</option>
            ))}
          </select>
          {errorFor("workMode")}
        </label>
        <label className="form-field">
          <span>Lien de l’offre</span>
          <div className="input-with-icon">
            <input name="offerUrl" type="url" defaultValue={values?.offerUrl ?? application?.offerUrl ?? ""} maxLength={500} placeholder="https://…" />
            <ExternalLink size={16} />
          </div>
          {errorFor("offerUrl")}
        </label>
        <TagInput
          availableTags={availableTags}
          defaultTags={application?.tags}
          error={errorMessage("tags")}
        />
        <label className="form-field form-field-wide">
          <span>Notes</span>
          <textarea
            name="notes"
            defaultValue={values?.notes ?? application?.notes ?? ""}
            maxLength={5000}
            rows={7}
            placeholder="Contact, prochaines étapes, éléments à préparer…"
          />
          {errorFor("notes")}
        </label>
      </div>

      <div className="form-actions">
        <Link href={application ? `/candidatures/${application.id}` : "/"} className="button button-ghost">Annuler</Link>
        <button type="submit" className="button button-primary" disabled={isPending}>
          <Save size={17} />
          {isPending ? "Enregistrement…" : application ? "Enregistrer" : "Ajouter la candidature"}
        </button>
      </div>
    </form>
  );
}
