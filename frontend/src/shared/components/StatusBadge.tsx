import type { ReactNode } from "react";

export type BadgeKind = "success" | "warning" | "error" | "info" | "neutral";

const ICONS: Record<BadgeKind, string> = { success: "✓", warning: "!", error: "✕", info: "i", neutral: "–" };

/** Status as icon plus text, so meaning never depends on colour alone. */
export default function StatusBadge({ kind, children }: { kind: BadgeKind; children: ReactNode }) {
  return (
    <span className={`badge badge--${kind}`}>
      <span className="badge__icon" aria-hidden="true">
        {ICONS[kind]}
      </span>
      {children}
    </span>
  );
}
