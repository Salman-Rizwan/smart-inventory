import type { Product } from "../inventory/types";
import type { Movement, OrderTiming } from "./types";

/*
 * Business intelligence over the stock change log and the purchase orders: pure functions, so every
 * figure is unit-tested and the Python check script (backend/scripts/insights_check.py) can recompute
 * each one independently. Nothing here reads Firestore or formats for display.
 *
 * Definitions (docs/DESIGN_DECISIONS.md, "Business intelligence in the browser"):
 * - A period is the last 7, 30 or 90 local calendar days, today included. The previous period is the
 *   same number of days immediately before it.
 * - Sales are Sale entries net of Customer Return adjustments, each at its entry's own price. Reset
 *   entries are left out. Entries without a price count in units but not in value.
 * - Shrinkage is the Damaged and Lost or Stolen write-offs, at each entry's own cost.
 * - Days of cover is the shelf count divided by the average daily net sales over the period.
 * - Lead time is the median of received minus created over orders received in the period.
 * - The suggested reorder level is lead-time demand plus a safety margin of half that demand, at least
 *   one unit, rounded up. It needs 14 days of history for the part and 2 received deliveries.
 */

export const PERIODS = [7, 30, 90] as const;
export type PeriodDays = (typeof PERIODS)[number];
export const DEFAULT_PERIOD: PeriodDays = 30;
/** How far back the loader reads: the longest period plus its previous period for the comparison. */
export const WINDOW_DAYS = 180;
export const MIN_HISTORY_DAYS = 14;
export const MIN_DELIVERIES = 2;
export const SAFETY_SHARE = 0.5;
export const SHRINKAGE_REASONS = ["Damaged", "LostOrStolen"] as const;
export type ShrinkageReason = (typeof SHRINKAGE_REASONS)[number];

const DAY_MS = 24 * 60 * 60 * 1000;

export const isPeriodDays = (value: unknown): value is PeriodDays => PERIODS.includes(value as PeriodDays);

/** The period from a URL parameter ("7", "30", "90"), or the default for anything else. */
export const parsePeriod = (value: string | null): PeriodDays => {
  const n = Number(value);
  return isPeriodDays(n) ? n : DEFAULT_PERIOD;
};

/** Local midnight of the day holding `date`. Built from the date parts, so it is right across DST changes. */
export const localMidnight = (date: Date): Date => new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, date.getHours(), date.getMinutes(), date.getSeconds());

const pad = (n: number) => String(n).padStart(2, "0");
/** The local calendar day as "YYYY-MM-DD", the key that groups entries into days. */
export const dayKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

export interface Period {
  days: PeriodDays;
  start: Date; // local midnight, `days - 1` days before today
  end: Date; // now
  previousStart: Date; // local midnight, the same number of days before `start`
}

/** Where the loader's window starts: local midnight, WINDOW_DAYS before `now`. */
export const windowStart = (now: Date): Date => addDays(localMidnight(now), -WINDOW_DAYS);

export function periodRange(now: Date, days: PeriodDays): Period {
  const today = localMidnight(now);
  return { days, start: addDays(today, -(days - 1)), end: now, previousStart: addDays(today, -(2 * days - 1)) };
}

/** Each local day of the period in order, oldest first. */
export function periodDays(period: Period): Date[] {
  const days: Date[] = [];
  for (let day = period.start; day < period.end; day = addDays(day, 1)) days.push(day);
  return days;
}

export const within = (at: Date, start: Date, end: Date): boolean => at >= start && at < end;

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/** Money sums are kept to the cent, so float noise never reaches a figure. */
const cents = (value: number): number => Math.round(value * 100) / 100;

// ---------- sales ----------

export interface SaleTotals {
  units: number; // net of returns, so a day with more returns than sales is negative
  value: number; // at each entry's own price
  unpriced: number; // units (sales or returns) that had no price and so are missing from `value`
}

export const emptySales = (): SaleTotals => ({ units: 0, value: 0, unpriced: 0 });

/** Units sold by one entry: positive for a sale, negative for a customer return, null for anything else. */
export function saleUnits(movement: Movement): number | null {
  if (movement.type === "Sale") return -movement.change;
  if (movement.type === "Adjustment" && movement.reason === "CustomerReturn") return -movement.change;
  return null;
}

function addSale(totals: SaleTotals, movement: Movement): void {
  const units = saleUnits(movement);
  if (units === null) return;
  totals.units += units;
  if (movement.unitPrice === null) totals.unpriced += Math.abs(units);
  else totals.value = cents(totals.value + units * movement.unitPrice);
}

export function salesTotals(movements: Movement[], start: Date, end: Date, part?: string | null): SaleTotals {
  const totals = emptySales();
  for (const m of movements) if (within(m.at, start, end) && (!part || m.product === part)) addSale(totals, m);
  return totals;
}

export interface DaySales {
  day: string; // "YYYY-MM-DD"
  date: Date; // local midnight
  byPart: Record<string, SaleTotals>;
  total: SaleTotals;
}

/** Net sales for every day of the period and every listed part, with zero rows for quiet days. */
export function salesByDay(movements: Movement[], period: Period, parts: string[]): DaySales[] {
  const rows = new Map<string, DaySales>();
  for (const date of periodDays(period)) {
    const byPart: Record<string, SaleTotals> = {};
    for (const part of parts) byPart[part] = emptySales();
    rows.set(dayKey(date), { day: dayKey(date), date, byPart, total: emptySales() });
  }
  for (const m of movements) {
    const row = rows.get(dayKey(m.at));
    if (!row || !within(m.at, period.start, period.end) || !(m.product in row.byPart)) continue;
    addSale(row.byPart[m.product], m);
    addSale(row.total, m);
  }
  return [...rows.values()];
}

export type SalesChange =
  | { kind: "change"; percent: number } // against the previous period
  | { kind: "new" } // sales now, none before
  | { kind: "none" } // no sales in either period
  | { kind: "unknown" }; // the previous period is outside the loaded window

export function salesChange(current: number, previous: number, previousLoaded: boolean): SalesChange {
  if (!previousLoaded) return { kind: "unknown" };
  if (previous <= 0) return current > 0 ? { kind: "new" } : { kind: "none" };
  return { kind: "change", percent: Math.round(((current - previous) / previous) * 100) };
}

// ---------- shrinkage ----------

export interface ShrinkageLine {
  part: string;
  reason: ShrinkageReason;
  units: number;
  value: number; // at each entry's own cost
  uncosted: number; // units with no cost, missing from `value`
}

export interface ShrinkageReport {
  lines: ShrinkageLine[]; // one per part and reason that had a write-off, parts in the given order
  units: number;
  value: number;
  uncosted: number;
  shareOfSales: number | null; // value / net sales value; null when there was no sales value
}

export const isShrinkage = (m: Movement): m is Movement & { reason: ShrinkageReason } =>
  m.type === "Adjustment" && m.change < 0 && SHRINKAGE_REASONS.includes(m.reason as ShrinkageReason);

export function shrinkage(
  movements: Movement[],
  start: Date,
  end: Date,
  parts: string[],
  salesValue: number,
  part?: string | null,
): ShrinkageReport {
  const lines = new Map<string, ShrinkageLine>();
  const report: ShrinkageReport = { lines: [], units: 0, value: 0, uncosted: 0, shareOfSales: null };
  for (const m of movements) {
    if (!isShrinkage(m) || !within(m.at, start, end) || (part && m.product !== part) || !parts.includes(m.product)) continue;
    const key = `${m.product}:${m.reason}`;
    const line = lines.get(key) ?? { part: m.product, reason: m.reason, units: 0, value: 0, uncosted: 0 };
    const units = -m.change;
    line.units += units;
    report.units += units;
    if (m.unitCost === null) {
      line.uncosted += units;
      report.uncosted += units;
    } else {
      line.value = cents(line.value + units * m.unitCost);
      report.value = cents(report.value + units * m.unitCost);
    }
    lines.set(key, line);
  }
  const order = (line: ShrinkageLine) => parts.indexOf(line.part) * SHRINKAGE_REASONS.length + SHRINKAGE_REASONS.indexOf(line.reason);
  report.lines = [...lines.values()].sort((a, b) => order(a) - order(b));
  report.shareOfSales = salesValue > 0 ? report.value / salesValue : null;
  return report;
}

// ---------- days of cover ----------

export type Cover =
  | { kind: "cover"; days: number; untilReorder: number } // untilReorder: days until the shelf reaches the reorder level
  | { kind: "no-sales" } // nothing sold in the period, so cover cannot be worked out
  | { kind: "no-scan" }; // the camera has never counted this part

export const averageDailySales = (units: number, days: number): number => (days > 0 ? units / days : 0);

export function daysOfCover(shelf: number | null, averageDaily: number, reorderLevel: number): Cover {
  if (shelf === null) return { kind: "no-scan" };
  if (averageDaily <= 0) return { kind: "no-sales" };
  return { kind: "cover", days: shelf / averageDaily, untilReorder: Math.max(0, shelf - reorderLevel) / averageDaily };
}

// ---------- dealer lead time ----------

export interface LeadTime {
  days: number; // median, fractional
  deliveries: number;
}

/** Orders received inside [start, end) with both times known; the median of their lead times. */
export function leadTime(orders: OrderTiming[], start: Date, end: Date, part?: string | null): LeadTime | null {
  const leads: number[] = [];
  for (const o of orders) {
    if (o.state !== "Received" || !o.createdAt || !o.receivedAt || !within(o.receivedAt, start, end)) continue;
    if (part && o.product !== part) continue;
    leads.push(Math.max(0, o.receivedAt.getTime() - o.createdAt.getTime()) / DAY_MS);
  }
  const days = median(leads);
  return days === null ? null : { days, deliveries: leads.length };
}

// ---------- reorder recommendation ----------

export type Recommendation =
  | { kind: "ok"; level: number; leadDemand: number; safety: number }
  | { kind: "no-sales" }
  | { kind: "not-enough"; historyDays: number; deliveries: number }; // what there is, against MIN_HISTORY_DAYS and MIN_DELIVERIES

export function recommendLevel(averageDaily: number, lead: LeadTime | null, historyDays: number): Recommendation {
  const deliveries = lead?.deliveries ?? 0;
  if (historyDays < MIN_HISTORY_DAYS || deliveries < MIN_DELIVERIES || !lead) {
    return { kind: "not-enough", historyDays: Math.floor(historyDays), deliveries };
  }
  if (averageDaily <= 0) return { kind: "no-sales" };
  const leadDemand = averageDaily * lead.days;
  const safety = Math.max(1, Math.ceil(leadDemand * SAFETY_SHARE));
  return { kind: "ok", level: Math.ceil(leadDemand + safety), leadDemand, safety };
}

/** Days since the part's oldest loaded record of any type; 0 with no record. */
export function historyDays(movements: Movement[], part: string, now: Date): number {
  let oldest: Date | null = null;
  for (const m of movements) if (m.product === part && (!oldest || m.at < oldest)) oldest = m.at;
  return oldest ? (now.getTime() - oldest.getTime()) / DAY_MS : 0;
}

// ---------- the whole report ----------

export interface PartInsight {
  part: string;
  name: string;
  sales: SaleTotals;
  averageDaily: number;
  shelf: number | null;
  reorderLevel: number;
  cover: Cover;
  historyDays: number;
  recommendation: Recommendation;
}

export interface InsightsReport {
  period: Period;
  parts: PartInsight[]; // every listed part, or only the filtered one
  byDay: DaySales[];
  sales: SaleTotals;
  change: SalesChange; // sales value against the previous period
  shrinkage: ShrinkageReport;
  lowestCover: PartInsight | null; // the part with the fewest days of cover, among those with a figure
  lead: LeadTime | null; // dealer-wide: the same dealer delivers every part
  includesDemo: boolean; // any seeded record in the period
}

export interface InsightsInput {
  movements: Movement[];
  orders: OrderTiming[];
  products: Product[];
  counts: Record<string, number> | null; // the latest shelf counts (status/latest)
  now: Date;
  days: PeriodDays;
  loadedFrom: Date; // the start of the loaded window, which decides whether a previous period exists
  part?: string | null;
}

export function computeInsights(input: InsightsInput): InsightsReport {
  const { movements, orders, products, counts, now, days, loadedFrom, part } = input;
  const period = periodRange(now, days);
  const chosen = part ? products.filter((p) => p.id === part) : products;
  const partIds = chosen.map((p) => p.id);
  const sales = salesTotals(movements, period.start, period.end, part);
  const previous = salesTotals(movements, period.previousStart, period.start, part);
  const lead = leadTime(orders, period.start, period.end);

  const parts: PartInsight[] = chosen.map((product) => {
    const own = salesTotals(movements, period.start, period.end, product.id);
    const averageDaily = averageDailySales(own.units, days);
    const shelf = counts && typeof counts[product.id] === "number" ? counts[product.id] : null;
    const history = historyDays(movements, product.id, now);
    return {
      part: product.id,
      name: product.name,
      sales: own,
      averageDaily,
      shelf,
      reorderLevel: product.reorderLevel,
      cover: daysOfCover(shelf, averageDaily, product.reorderLevel),
      historyDays: history,
      recommendation: recommendLevel(averageDaily, lead, history),
    };
  });

  let lowestCover: PartInsight | null = null;
  for (const p of parts) {
    if (p.cover.kind !== "cover") continue;
    if (!lowestCover || lowestCover.cover.kind !== "cover" || p.cover.days < lowestCover.cover.days) lowestCover = p;
  }

  const inPeriod = (at: Date | null) => at !== null && within(at, period.start, period.end);
  const includesDemo =
    movements.some((m) => m.seeded && inPeriod(m.at) && (!part || m.product === part)) ||
    orders.some((o) => o.seeded && (inPeriod(o.receivedAt) || inPeriod(o.createdAt)) && (!part || o.product === part));

  return {
    period,
    parts,
    byDay: salesByDay(movements, period, partIds),
    sales,
    change: salesChange(sales.value, previous.value, loadedFrom <= period.previousStart),
    shrinkage: shrinkage(movements, period.start, period.end, partIds, sales.value, part),
    lowestCover,
    lead,
    includesDemo,
  };
}
