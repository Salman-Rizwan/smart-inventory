import { formatInteger } from "../../shared/format";
import type { Alert, AlertState } from "./types";

export const countOpen = (alerts: Alert[]): number => alerts.filter((a) => a.state === "Open").length;

const STATE_ORDER: readonly AlertState[] = ["Open", "Acknowledged", "Resolved"];

/** Open alerts first, then acknowledged, then resolved; newest first within each. No timestamp yet sorts as newest. */
export function sortAlerts(alerts: Alert[]): Alert[] {
  const time = (a: Alert) => a.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...alerts].sort((a, b) => {
    const byState = STATE_ORDER.indexOf(a.state) - STATE_ORDER.indexOf(b.state);
    return byState !== 0 ? byState : time(b) - time(a);
  });
}

export function describeOpenCount(open: number): string {
  if (open === 0) return "No open alerts.";
  return `${open} open ${open === 1 ? "alert" : "alerts"}.`;
}

export type AlertFilter = "open" | "acknowledged" | "resolved" | "all";

export const ALERT_FILTERS: readonly { value: AlertFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "acknowledged", label: "Acknowledged" },
  { value: "resolved", label: "Resolved" },
  { value: "all", label: "All" },
];

/** Reads the filter from the URL; anything unknown falls back to Open. */
export function parseAlertFilter(raw: string | null): AlertFilter {
  return ALERT_FILTERS.some((f) => f.value === raw) ? (raw as AlertFilter) : "open";
}

/** True for filters that show resolved alerts, which come from the paged history. */
export const usesHistory = (filter: AlertFilter): boolean => filter === "resolved" || filter === "all";

/**
 * The rows for a filter. Open and Acknowledged come from the live active list, which is always
 * complete. Resolved come from the paged history. All is both, each alert once (the active list wins,
 * so an alert that is still active never shows twice).
 */
export function selectAlerts(active: Alert[], history: Alert[], filter: AlertFilter): Alert[] {
  const resolved = history.filter((a) => a.state === "Resolved");
  switch (filter) {
    case "open":
      return sortAlerts(active.filter((a) => a.state === "Open"));
    case "acknowledged":
      return sortAlerts(active.filter((a) => a.state === "Acknowledged"));
    case "resolved":
      return sortAlerts(resolved);
    default: {
      const activeIds = new Set(active.map((a) => a.id));
      return sortAlerts([...active, ...resolved.filter((a) => !activeIds.has(a.id))]);
    }
  }
}

/** The active alerts the dashboard shows: open first, newest first, at most `max`. */
export const dashboardAlerts = (active: Alert[], max: number): Alert[] => sortAlerts(active).slice(0, max);

/** A count from the paged history: "12", or "50+" while older alerts are not loaded yet. */
export const historyCount = (count: number, hasMore: boolean): string => `${formatInteger(count)}${hasMore ? "+" : ""}`;

/** The filter that lists an alert in this state, so an alert opened from a notification is visible. */
export const filterFor = (state: AlertState): AlertFilter =>
  state === "Open" ? "open" : state === "Acknowledged" ? "acknowledged" : "resolved";
