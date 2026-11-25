"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Download,
  Filter,
  List,
  Map as MapIcon,
  MessageSquare,
  Search,
  Tags,
  XCircle,
} from "lucide-react";
import type { ApplicationView } from "@/lib/application-view";
import { dashboardCounts, formatDate } from "@/lib/application-view";
import { APPLICATION_STATUSES, STATUS_LABELS } from "@/lib/status";
import { WORK_MODES, WORK_MODE_LABELS } from "@/lib/work-mode";
import { StatusSelect } from "@/components/status-select";
import { ApplicationHistory } from "@/components/application-history";
import { buildHistoryEvents, recentDateRange, validateDateRange, type DateRange } from "@/lib/application-history";
import type { ApplicationFollowUp } from "@/db/schema";
import { TagBadge } from "@/components/tag-badge";

const ApplicationMap = dynamic(
  () => import("@/components/application-map").then((module) => module.ApplicationMap),
  { ssr: false, loading: () => <div className="map-loading">Chargement de la carte…</div> },
);

type SortKey = "applicationDate" | "updatedAt" | "company";
type ViewMode = "list" | "map" | "history";
type HistoryPeriod = "all" | "30" | "90" | "custom";

export function Dashboard({ applications, followUps = [] }: { applications: ApplicationView[]; followUps?: ApplicationFollowUp[] }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [hideRejected, setHideRejected] = useState(false);
  const [tag, setTag] = useState("all");
  const [workMode, setWorkMode] = useState("all");
  const [sort, setSort] = useState<SortKey>("applicationDate");
  const [view, setView] = useState<ViewMode>("list");
  const [historyPeriod, setHistoryPeriod] = useState<HistoryPeriod>("all");
  const [historyRange, setHistoryRange] = useState<DateRange | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [periodError, setPeriodError] = useState<string | null>(null);
  const counts = dashboardCounts(applications);
  const availableTags = useMemo(() => {
    const unique = new Map<string, string>();
    for (const application of applications) {
      for (const item of application.tags) unique.set(item.name.toLocaleLowerCase("fr"), item.name);
    }
    return [...unique.values()].sort((left, right) => left.localeCompare(right, "fr"));
  }, [applications]);

  const visibleApplications = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("fr");
    return applications
      .filter((item) => status === "all" || item.status === status)
      .filter((item) => !hideRejected || status === "rejected" || item.status !== "rejected")
      .filter((item) => tag === "all" || item.tags.some((itemTag) => itemTag.name === tag))
      .filter((item) => workMode === "all" || item.workMode === workMode)
      .filter((item) => {
        if (!normalized) return true;
        return [item.company, item.title, item.location ?? "", ...item.tags.map((itemTag) => itemTag.name)]
          .some((value) => value.toLocaleLowerCase("fr").includes(normalized));
      })
      .toSorted((left, right) => {
        if (sort === "company") return left.company.localeCompare(right.company, "fr");
        if (sort === "updatedAt") return right.updatedAt - left.updatedAt;
        return right.applicationDate.localeCompare(left.applicationDate);
      });
  }, [applications, hideRejected, query, sort, status, tag, workMode]);

  const historyEvents = useMemo(() => buildHistoryEvents(visibleApplications, followUps, historyRange), [visibleApplications, followUps, historyRange]);
  const displayedCount = view === "history" ? new Set(historyEvents.map((event) => event.application.id)).size : visibleApplications.length;

  const cards = [
    { label: "Total", value: counts.total, icon: Briefcase, tone: "slate" },
    { label: "En cours", value: counts.active, icon: Clock3, tone: "blue" },
    { label: "Entretiens", value: counts.interview, icon: MessageSquare, tone: "violet" },
    { label: "Offres reçues", value: counts.offer, icon: CheckCircle2, tone: "green" },
    { label: "Refusées", value: counts.rejected, icon: XCircle, tone: "red" },
  ];

  return (
    <>
      <section className="metrics" aria-label="Indicateurs">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <article className="metric-card" key={label}>
            <span className={`metric-icon metric-${tone}`}><Icon size={20} /></span>
            <span className="metric-value">{value}</span>
            <span className="metric-label">{label}</span>
          </article>
        ))}
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Mes candidatures</h2>
            <p aria-live="polite">{view === "history" ? `${displayedCount} candidature${displayedCount > 1 ? "s" : ""} · ${historyEvents.length} événement${historyEvents.length > 1 ? "s" : ""}` : `${displayedCount} résultat${displayedCount > 1 ? "s" : ""}`}</p>
          </div>
          <div className="panel-actions">
            <a href="/export/csv" className="button button-secondary">
              <Download size={17} aria-hidden="true" /> Exporter en CSV
            </a>
            <div className="view-toggle" role="group" aria-label="Mode d’affichage">
              <button type="button" aria-pressed={view === "list"} className={view === "list" ? "active" : undefined} onClick={() => setView("list")}>
                <List size={16} /> Liste
              </button>
              <button type="button" aria-pressed={view === "map"} className={view === "map" ? "active" : undefined} onClick={() => setView("map")}>
                <MapIcon size={16} /> Carte
              </button>
              <button type="button" aria-pressed={view === "history"} className={view === "history" ? "active" : undefined} onClick={() => setView("history")}>
                <CalendarDays size={16} aria-hidden="true" /> Historique
              </button>
            </div>
          </div>
        </div>

        <div className="toolbar dashboard-toolbar">
          <label className="search-field">
            <Search size={18} aria-hidden="true" />
            <span className="sr-only">Rechercher</span>
            <input
              type="search"
              placeholder="Entreprise, poste, ville ou tag…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="select-field">
            <Filter size={17} aria-hidden="true" />
            <span className="sr-only">Filtrer par statut</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)}>
              <option value="all">Tous les statuts</option>
              {APPLICATION_STATUSES.map((value) => (
                <option key={value} value={value}>{STATUS_LABELS[value]}</option>
              ))}
            </select>
          </label>
          <label className="select-field check-field">
            <input type="checkbox" checked={hideRejected} onChange={(event) => setHideRejected(event.target.checked)} />
            <span>Masquer les refusées</span>
          </label>
          <label className="select-field">
            <Tags size={17} aria-hidden="true" />
            <span className="sr-only">Filtrer par tag</span>
            <select value={tag} onChange={(event) => setTag(event.target.value)}>
              <option value="all">Tous les tags</option>
              {availableTags.map((value) => <option key={value} value={value}>{value}</option>)}
            </select>
          </label>
          <label className="select-field">
            <Briefcase size={17} aria-hidden="true" />
            <span className="sr-only">Filtrer par mode de travail</span>
            <select value={workMode} onChange={(event) => setWorkMode(event.target.value)}>
              <option value="all">Tous les modes</option>
              {WORK_MODES.map((value) => <option key={value} value={value}>{WORK_MODE_LABELS[value]}</option>)}
            </select>
          </label>
          {view === "list" ? (
            <label className="select-field sort-field">
              <span>Trier par</span>
              <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)}>
                <option value="applicationDate">Plus récentes</option>
                <option value="updatedAt">Dernière modification</option>
                <option value="company">Entreprise A–Z</option>
              </select>
            </label>
          ) : null}
        </div>

        {view === "history" ? (
          <div className="history-controls">
            <div className="history-period-field">
              <label htmlFor="history-period">Période</label>
              <select id="history-period" value={historyPeriod} onChange={(event) => {
                const period = event.target.value as HistoryPeriod;
                setHistoryPeriod(period);
                setPeriodError(null);
                if (period === "all") setHistoryRange(null);
                if (period === "30" || period === "90") setHistoryRange(recentDateRange(Number(period)));
              }}>
                <option value="all">Tout l’historique</option>
                <option value="30">30 jours</option>
                <option value="90">90 jours</option>
                <option value="custom">Personnalisée</option>
              </select>
            </div>
            {historyPeriod === "custom" ? (
              <form className="history-date-form" noValidate onSubmit={(event) => {
                event.preventDefault();
                const error = validateDateRange(startDate, endDate);
                setPeriodError(error);
                if (!error) setHistoryRange({ start: startDate, end: endDate });
              }}>
                <label className="history-period-field"><span>Date de début</span><input type="date" required value={startDate} aria-describedby={periodError ? "history-period-error" : undefined} onChange={(event) => setStartDate(event.target.value)} /></label>
                <label className="history-period-field"><span>Date de fin</span><input type="date" required value={endDate} aria-describedby={periodError ? "history-period-error" : undefined} onChange={(event) => setEndDate(event.target.value)} /></label>
                <button type="submit" className="button button-secondary">Appliquer</button>
                {periodError ? <p id="history-period-error" className="history-period-error" role="alert">{periodError}</p> : null}
              </form>
            ) : null}
            <p className="history-period-summary" role="status">Période affichée : {historyRange ? `du ${formatDate(historyRange.start)} au ${formatDate(historyRange.end)}` : "tout l’historique"}.</p>
          </div>
        ) : null}

        {applications.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon"><Briefcase size={28} /></span>
            <h3>Votre première candidature commence ici</h3>
            <p>Ajoutez une offre pour commencer à suivre vos démarches.</p>
            <Link href="/candidatures/nouvelle" className="button button-primary">Ajouter une candidature</Link>
          </div>
        ) : displayedCount === 0 ? (
          <div className="empty-state compact">
            <h3>Aucun résultat</h3>
            <p>{view === "history" ? "Aucune candidature pour cette période et ces filtres. Essayez de modifier la période, votre recherche ou vos filtres." : "Essayez de modifier votre recherche ou vos filtres."}</p>
          </div>
        ) : view === "map" ? (
          <ApplicationMap applications={visibleApplications} />
        ) : view === "history" ? (
          <ApplicationHistory events={historyEvents} />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Poste</th>
                  <th>Ville</th>
                  <th>Mode</th>
                  <th>Date</th>
                  <th>Statut</th>
                  <th><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {visibleApplications.map((application) => (
                  <tr key={application.id}>
                    <td>
                      <Link href={`/candidatures/${application.id}`} className="job-link">
                        <strong>{application.title}</strong>
                        <span>{application.company}</span>
                      </Link>
                      <div className="tag-list table-tags">
                        {application.tags.map((item) => <TagBadge key={item.id} name={item.name} />)}
                      </div>
                    </td>
                    <td>{application.location || <span className="muted">Non renseignée</span>}</td>
                    <td><span className="work-mode-badge">{WORK_MODE_LABELS[application.workMode]}</span></td>
                    <td><span className="date-cell"><CalendarDays size={15} />{formatDate(application.applicationDate)}</span></td>
                    <td><StatusSelect applicationId={application.id} currentStatus={application.status} /></td>
                    <td className="row-actions">
                      {application.offerUrl ? (
                        <a href={application.offerUrl} target="_blank" rel="noreferrer" className="icon-button" aria-label="Ouvrir l’offre">
                          <ArrowUpRight size={18} />
                        </a>
                      ) : null}
                      <Link href={`/candidatures/${application.id}`} className="details-link">Détails</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
