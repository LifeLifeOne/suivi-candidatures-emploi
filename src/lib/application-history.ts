import type { ApplicationView } from "@/lib/application-view";
import type { ApplicationFollowUp } from "@/db/schema";

export type DateRange = { start: string; end: string };

export type HistoryEvent = { id: string; kind: "sent" | "followUp"; date: string; application: ApplicationView; note: string };

export function buildHistoryEvents(applications: ApplicationView[], followUps: ApplicationFollowUp[], range: DateRange | null = null): HistoryEvent[] {
  const byId = new Map(applications.map((application) => [application.id, application]));
  const events: HistoryEvent[] = applications.map((application) => ({ id: `sent-${application.id}`, kind: "sent", date: application.applicationDate, application, note: "" }));
  for (const followUp of followUps) {
    const application = byId.get(followUp.applicationId);
    if (application) events.push({ id: `follow-up-${followUp.id}`, kind: "followUp", date: followUp.date, application, note: followUp.note });
  }
  return range ? events.filter(({ date }) => date >= range.start && date <= range.end) : events;
}

export function groupHistoryEvents(events: HistoryEvent[]) {
  const months = new Map<string, Map<string, HistoryEvent[]>>();
  const sorted = events.toSorted((a, b) => b.date.localeCompare(a.date)
    || a.application.company.localeCompare(b.application.company, "fr")
    || a.application.title.localeCompare(b.application.title, "fr")
    || a.application.id - b.application.id || a.id.localeCompare(b.id, "fr", { numeric: true }));
  for (const event of sorted) {
    const month = event.date.slice(0, 7);
    if (!months.has(month)) months.set(month, new Map());
    const days = months.get(month)!;
    if (!days.has(event.date)) days.set(event.date, []);
    days.get(event.date)!.push(event);
  }
  return [...months].map(([month, days]) => ({ month, days: [...days].map(([date, items]) => ({ date, events: items })) }));
}

export function recentDateRange(days: number, today = new Date()): DateRange {
  const end = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const start = new Date(`${end}T00:00:00Z`);
  start.setUTCDate(start.getUTCDate() - days + 1);
  return { start: start.toISOString().slice(0, 10), end };
}

export function validateDateRange(start: string, end: string): string | null {
  if (!start || !end) return "Renseignez une date de début et une date de fin.";
  const valid = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (!valid(start) || !valid(end)) return "Renseignez des dates valides.";
  if (start > end) return "La date de début doit précéder ou être égale à la date de fin.";
  return null;
}

export function filterHistoryPeriod(applications: ApplicationView[], range: DateRange | null) {
  return range ? applications.filter(({ applicationDate }) => applicationDate >= range.start && applicationDate <= range.end) : applications;
}

export function groupApplicationHistory(applications: ApplicationView[]) {
  return groupHistoryEvents(buildHistoryEvents(applications, [])).map(({ month, days }) => ({ month, days: days.map(({ date, events }) => ({ date, applications: events.map((event) => event.application) })) }));
}
