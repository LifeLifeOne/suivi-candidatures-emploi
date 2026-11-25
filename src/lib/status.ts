export const APPLICATION_STATUSES = [
  "applied",
  "waiting",
  "interview",
  "offer",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_LABELS: Record<ApplicationStatus, string> = {
  applied: "Postulée",
  waiting: "En attente",
  interview: "Entretien",
  offer: "Offre reçue",
  rejected: "Refusée",
  withdrawn: "Abandonnée",
};

export const STATUS_STYLES: Record<ApplicationStatus, string> = {
  applied: "status-applied",
  waiting: "status-waiting",
  interview: "status-interview",
  offer: "status-offer",
  rejected: "status-rejected",
  withdrawn: "status-withdrawn",
};

export function isApplicationStatus(value: unknown): value is ApplicationStatus {
  return typeof value === "string" && APPLICATION_STATUSES.includes(value as ApplicationStatus);
}
