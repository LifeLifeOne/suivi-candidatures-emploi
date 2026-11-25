import type { ReactNode } from "react";
import { tagColors } from "@/lib/tags";

export function TagBadge({ name, chip = false, children }: { name: string; chip?: boolean; children?: ReactNode }) {
  return <span className={chip ? "tag-chip" : "tag-badge"} style={tagColors(name)}>{name}{children}</span>;
}
