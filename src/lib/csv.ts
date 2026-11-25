import type { ApplicationView } from "@/lib/application-view";
import { STATUS_LABELS } from "@/lib/status";
import { WORK_MODE_LABELS } from "@/lib/work-mode";

function escapeCell(value: string | number | null) {
  const text = value === null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export function applicationsToCsv(applications: ApplicationView[]) {
  const headers = [
    "Entreprise",
    "Poste",
    "Tags",
    "Ville",
    "Code INSEE",
    "Latitude",
    "Longitude",
    "Mode de travail",
    "Date de candidature",
    "Statut",
    "Lien",
    "Notes",
  ];
  const rows = applications.map((item) => [
    item.company,
    item.title,
    item.tags.map((tag) => tag.name).join(", "),
    item.location,
    item.cityCode,
    item.latitude,
    item.longitude,
    WORK_MODE_LABELS[item.workMode],
    item.applicationDate,
    STATUS_LABELS[item.status],
    item.offerUrl,
    item.notes,
  ]);
  return `\uFEFF${[headers, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n")}\r\n`;
}
