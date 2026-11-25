export const WORK_MODES = ["unspecified", "onsite", "hybrid", "remote"] as const;

export type WorkMode = (typeof WORK_MODES)[number];

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  unspecified: "Non précisé",
  onsite: "Sur site",
  hybrid: "Hybride",
  remote: "Télétravail",
};

