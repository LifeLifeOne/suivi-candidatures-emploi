import type { Application } from "@/db/schema";
import type { ApplicationStatus } from "@/lib/status";
import type { WorkMode } from "@/lib/work-mode";

export type TagView = { id: number; name: string };

export type ApplicationView = Omit<Application, "status" | "workMode"> & {
  status: ApplicationStatus;
  workMode: WorkMode;
  tags: TagView[];
};

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

export function formatDateTime(value: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

export function dashboardCounts(applications: ApplicationView[]) {
  return {
    total: applications.length,
    active: applications.filter((item) => ["applied", "waiting", "interview"].includes(item.status)).length,
    interview: applications.filter((item) => item.status === "interview").length,
    offer: applications.filter((item) => item.status === "offer").length,
    rejected: applications.filter((item) => item.status === "rejected").length,
  };
}
