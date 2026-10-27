import type { Alert } from "./types";

export const countOpen = (alerts: Alert[]): number => alerts.filter((a) => a.state === "Open").length;

/** Open alerts first, then newest first. Alerts with no timestamp yet sort as newest. */
export function sortAlerts(alerts: Alert[]): Alert[] {
  const time = (a: Alert) => a.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...alerts].sort((a, b) => {
    if (a.state !== b.state) return a.state === "Open" ? -1 : 1;
    return time(b) - time(a);
  });
}

export function describeOpenCount(open: number): string {
  if (open === 0) return "No open alerts.";
  return `${open} open ${open === 1 ? "alert" : "alerts"}.`;
}
