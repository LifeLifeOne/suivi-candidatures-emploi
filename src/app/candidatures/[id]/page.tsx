import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, BriefcaseBusiness, Building2, CalendarDays, MapPin, Pencil, RotateCcw, StickyNote, Tags } from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { ApplicationForm } from "@/components/application-form";
import { DeleteButton } from "@/components/delete-button";
import { DocumentManager } from "@/components/document-manager";
import { PageHeading } from "@/components/page-heading";
import { findApplication, listApplicationDocuments, listFollowUps, listStatusHistory, listTags } from "@/db/repository";
import { FollowUpManager } from "@/components/follow-up-manager";
import { TagBadge } from "@/components/tag-badge";
import { calendarDate } from "@/lib/follow-up";
import type { ApplicationStatus } from "@/lib/status";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status";
import { formatDate, formatDateTime, type ApplicationView } from "@/lib/application-view";
import { WORK_MODE_LABELS } from "@/lib/work-mode";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string; updated?: string }>;
};

export default async function ApplicationDetailPage({ params, searchParams }: Props) {
  const [{ id: rawId }, query] = await Promise.all([params, searchParams]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();

  const application = findApplication(id) as ApplicationView | undefined;
  if (!application) notFound();
  const history = listStatusHistory(id);
  const documents = listApplicationDocuments(id);
  const availableTags = listTags();
  const followUps = listFollowUps(id);
  const historyEntries = [
    ...history.map((entry) => ({ kind: "status" as const, entry, date: calendarDate(new Date(entry.changedAt)), timestamp: entry.changedAt })),
    ...followUps.map((entry) => ({ kind: "followUp" as const, entry, date: entry.date, timestamp: entry.createdAt })),
  ].toSorted((a, b) => b.date.localeCompare(a.date) || b.timestamp - a.timestamp);

  return (
    <main className="shell">
      <AppHeader />
      <div className="content narrow-content">
        <PageHeading eyebrow={application.company} title={application.title} />
        {query.updated ? <div className="success-banner" role="status">Modifications enregistrées.</div> : null}

        {query.edit ? (
          <section className="panel form-panel">
            <ApplicationForm application={application} availableTags={availableTags} />
          </section>
        ) : (
          <>
            <section className="detail-layout">
              <article className="panel detail-card">
                <div className="detail-card-heading">
                  <span className={`status-badge ${STATUS_STYLES[application.status]}`}>{STATUS_LABELS[application.status]}</span>
                  <Link href={`/candidatures/${id}?edit=1`} className="button button-edit"><Pencil size={16} aria-hidden="true" /> Modifier</Link>
                </div>
                <dl className="detail-list">
                  <div><dt><Building2 size={17} /> Entreprise</dt><dd>{application.company}</dd></div>
                  <div><dt><MapPin size={17} /> Localisation</dt><dd>{application.location || "Non renseignée"}</dd></div>
                  <div><dt><BriefcaseBusiness size={17} /> Mode de travail</dt><dd>{WORK_MODE_LABELS[application.workMode]}</dd></div>
                  <div><dt><CalendarDays size={17} /> Candidature envoyée</dt><dd>{formatDate(application.applicationDate)}</dd></div>
                  {application.offerUrl ? (
                    <div><dt><ArrowUpRight size={17} /> Offre</dt><dd><a href={application.offerUrl} target="_blank" rel="noreferrer">Ouvrir le lien <ArrowUpRight size={14} /></a></dd></div>
                  ) : null}
                </dl>
                <div className="detail-tags">
                  <h2><Tags size={18} /> Tags</h2>
                  <div className="tag-list">
                    {application.tags.map((tag) => <TagBadge key={tag.id} name={tag.name} />)}
                  </div>
                </div>
                <div className="notes-block">
                  <h2><StickyNote size={18} /> Notes</h2>
                  <p>{application.notes || "Aucune note pour le moment."}</p>
                </div>
                <FollowUpManager applicationId={id} followUps={followUps} />
                <DocumentManager
                  key={documents.map((document) => document.id).join("-") || "empty"}
                  applicationId={id}
                  documents={documents}
                />
                <div className="danger-zone"><DeleteButton applicationId={id} /></div>
              </article>

              <aside className="panel history-card">
                <h2>Historique</h2>
                <ol className="timeline">
                  {historyEntries.map((event) => event.kind === "followUp" ? (
                    <li key={`follow-up-${event.entry.id}`}>
                      <span className="timeline-dot follow-up-badge" aria-hidden="true" />
                      <div><strong className="follow-up-label"><RotateCcw size={14} aria-hidden="true" /> Relance</strong>{event.entry.note ? <span className="timeline-note">{event.entry.note}</span> : null}<time dateTime={event.date}>{formatDate(event.date)}</time></div>
                    </li>
                  ) : (
                    <li key={`status-${event.entry.id}`}>
                      <span className={`timeline-dot ${STATUS_STYLES[event.entry.toStatus as ApplicationStatus]}`} />
                      <div>
                        <strong>{STATUS_LABELS[event.entry.toStatus as ApplicationStatus]}</strong>
                        <span>{event.entry.fromStatus ? `Depuis « ${STATUS_LABELS[event.entry.fromStatus as ApplicationStatus]} »` : "Candidature créée"}</span>
                        <time dateTime={new Date(event.entry.changedAt).toISOString()}>{formatDateTime(event.entry.changedAt)}</time>
                      </div>
                    </li>
                  ))}
                </ol>
              </aside>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
