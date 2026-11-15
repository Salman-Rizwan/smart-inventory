import { addDays, localMidnight } from "../insights/analytics";
import type { Movement } from "../insights/types";
import { MOVEMENT_LABELS, REASON_LABELS } from "./movements";

/*
 * The Stock Log view (Products, second view): every POS change in a period, newest first. Pure, so every
 * rule is unit-tested. It reads the stock changes Insights already keeps live (the last 180 days), so the
 * log costs no extra reads and the part filter covers every entry in the period, not only those shown.
 */

export const LOG_PERIODS = ["today", "7", "30", "90"] as const;
export type LogPeriod = (typeof LOG_PERIODS)[number];
export const DEFAULT_LOG_PERIOD: LogPeriod = "30";
export const LOG_PAGE_SIZE = 50;

export const LOG_PERIOD_LABELS: Record<LogPeriod, string> = { today: "Today", "7": "7 Days", "30": "30 Days", "90": "90 Days" };

/** For sentences: "today", "the last 7 days". */
export const describeLogPeriod = (period: LogPeriod): string => (period === "today" ? "today" : `the last ${period} days`);

export const parseLogPeriod = (value: string | null): LogPeriod =>
  LOG_PERIODS.includes(value as LogPeriod) ? (value as LogPeriod) : DEFAULT_LOG_PERIOD;

/** Local midnight at the start of the period; the days count today, as Insights does. */
export function logPeriodStart(now: Date, period: LogPeriod): Date {
  const today = localMidnight(now);
  return period === "today" ? today : addDays(today, -(Number(period) - 1));
}

/** Entries in the period (and for one part, unless null), newest first. Ties keep a stable order by id. */
export function filterLog(movements: readonly Movement[], start: Date, part: string | null): Movement[] {
  return movements
    .filter((m) => m.at >= start && (part === null || m.product === part))
    .sort((a, b) => b.at.getTime() - a.at.getTime() || b.id.localeCompare(a.id));
}

/** The URL for a view of the log; the defaults are left out so the address stays short. */
export function logSearch(period: LogPeriod, part: string | null): Record<string, string> {
  const search: Record<string, string> = {};
  if (period !== DEFAULT_LOG_PERIOD) search.period = period;
  if (part) search.part = part;
  return search;
}

/** The link from a Stock Check row: that part's changes over the last 30 days. */
export const historyHref = (partId: string): string => `/products/log?part=${encodeURIComponent(partId)}&period=30`;

// Entries written by the backend's scripts carry the script's name in `by`.
const SCRIPTS: Record<string, string> = {
  demo_reset: "Demo Reset script",
  seed_products: "Seed Products script",
  seed_history: "Demo data",
};

/** Who made the change, as the shopkeeper reads it: never a raw account id. */
export function byLabel(movement: Movement, uid: string | null): string {
  if (movement.seeded) return "Demo data";
  if (SCRIPTS[movement.by]) return SCRIPTS[movement.by];
  if (!movement.by) return "Unknown";
  return movement.by === uid ? "You" : "Another user";
}

/** "Sale", "Stock Received", "Adjustment: Lost or Stolen", "Order Received". */
export function changeLabel(movement: Movement): string {
  const type = MOVEMENT_LABELS[movement.type];
  return movement.type === "Adjustment" && movement.reason ? `${type}: ${REASON_LABELS[movement.reason]}` : type;
}
