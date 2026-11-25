import Link from "next/link";
import { RotateCcw } from "lucide-react";
import { groupHistoryEvents, type HistoryEvent } from "@/lib/application-history";
import { formatDate } from "@/lib/application-view";
import { STATUS_LABELS, STATUS_STYLES } from "@/lib/status";
import { TagBadge } from "@/components/tag-badge";

const monthFormatter = new Intl.DateTimeFormat("fr-FR", { month: "long", year: "numeric", timeZone: "UTC" });

export function ApplicationHistory({ events }: { events: HistoryEvent[] }) {
  const months = groupHistoryEvents(events);
  return (
    <section className="application-history" aria-label="Historique des candidatures envoyées">
      <ol className="history-months">
        {months.map(({ month, days }) => (
          <li key={month}>
            <h3 className="history-month"><time dateTime={month}>{monthFormatter.format(new Date(`${month}-01T00:00:00Z`))}</time></h3>
            <ol className="history-days">
              {days.map(({ date, events: items }) => (
                <li className="history-day" key={date}>
                  <h4><time dateTime={date}>{formatDate(date)}</time></h4>
                  <ul className="history-entries">
                    {items.map(({ id, kind, application, note }) => (
                      <li className={`history-entry${kind === "followUp" ? " history-entry-follow-up" : ""}`} key={id}>
                        <Link href={`/candidatures/${application.id}`} className="history-job">
                          <strong>{application.title}</strong>
                          <span>{application.company}</span>
                          <span className="tag-list">{application.tags.map((tag) => <TagBadge key={tag.id} name={tag.name} />)}</span>
                        </Link>
                        {kind === "followUp" ? <span className="status-badge follow-up-badge"><RotateCcw size={13} aria-hidden="true" /> Relance</span> : <span className={`status-badge ${STATUS_STYLES[application.status]}`}>{STATUS_LABELS[application.status]}</span>}
                        {note ? <p className="history-event-note">{note}</p> : null}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </li>
        ))}
      </ol>
    </section>
  );
}
