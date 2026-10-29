import Chip from "@mui/material/Chip";
import type { ReactNode } from "react";

export type BadgeKind = "success" | "warning" | "error" | "info" | "neutral";

const ICONS: Record<BadgeKind, string> = { success: "✓", warning: "!", error: "✕", info: "i", neutral: "–" };
const COLORS = { success: "success", warning: "warning", error: "error", info: "info", neutral: "default" } as const;

/** Status as icon plus text, so meaning never depends on colour alone. */
export default function StatusBadge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  return (
    <Chip
      component="span"
      size="small"
      color={COLORS[kind]}
      icon={<span aria-hidden="true">{ICONS[kind]}</span>}
      label={children}
    />
  );
}
