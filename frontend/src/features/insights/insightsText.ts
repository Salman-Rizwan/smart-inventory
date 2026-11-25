import { formatInteger, formatMoney } from "../../shared/format";
import type { BadgeKind } from "../../shared/components/StatusBadge";
import { marginOf, type Action, type Cover, type LeadTime, type Recommendation, type SaleTotals, type SalesChange } from "./analytics";

/*
 * How each figure reads on the tiles and the page. Pure, so every wording and edge case is tested.
 * Every "no data" case says what is missing and what to do, never a 0 or an infinity.
 */

const oneDecimal = new Intl.NumberFormat(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const percent = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0 });
const signedPercent = new Intl.NumberFormat(undefined, { style: "percent", maximumFractionDigits: 0, signDisplay: "exceptZero" });

/** Days as "2.5" below 10, whole above, "365+" beyond a year. */
export function formatDays(days: number): string {
  if (days >= 365) return "365+";
  return days < 10 ? oneDecimal.format(days) : formatInteger(Math.round(days));
}

export const formatShare = (fraction: number | null): string => (fraction === null ? "—" : percent.format(fraction));

export function describeChange(change: SalesChange, periodDays: number): string {
  switch (change.kind) {
    case "change":
      return `${signedPercent.format(change.percent / 100)} vs the previous ${periodDays} days`;
    case "new":
      return `No sales in the previous ${periodDays} days`;
    case "none":
      return "No sales in this or the previous period";
    case "unknown":
      return "No earlier period loaded to compare with";
  }
}

/** The sales value, or the units when no entry had a price. */
export function salesValueText(sales: SaleTotals): string {
  if (sales.value === 0 && sales.unpriced > 0) return `${formatInteger(sales.units)} units`;
  return formatMoney(sales.value);
}

/** A note when some units are missing from the value because they had no price. */
export function unpricedNote(sales: SaleTotals): string {
  if (sales.unpriced === 0) return "";
  return `${formatInteger(sales.unpriced)} ${sales.unpriced === 1 ? "unit has" : "units have"} no price and ${sales.unpriced === 1 ? "is" : "are"} not in the value. Set a price in Part Settings.`;
}

export function coverValue(cover: Cover): string {
  switch (cover.kind) {
    case "cover":
      return `${formatDays(cover.days)} days`;
    case "no-sales":
      return "No recent sales";
    case "no-scan":
      return "No scan yet";
  }
}

export function coverHint(cover: Cover, reorderLevel: number): string {
  switch (cover.kind) {
    case "cover":
      return cover.untilReorder === 0
        ? `At or below the reorder level of ${formatInteger(reorderLevel)}`
        : `${formatDays(cover.untilReorder)} days until the reorder level of ${formatInteger(reorderLevel)}`;
    case "no-sales":
      return "Nothing sold in this period, so cover cannot be worked out";
    case "no-scan":
      return "Scan the shelf to count this part";
  }
}

export const leadValue = (lead: LeadTime | null): string => (lead ? `${formatDays(lead.days)} days` : "No deliveries yet");

export function leadHint(lead: LeadTime | null): string {
  if (!lead) return "Shown once an order has been received in this period";
  return `Median of ${formatInteger(lead.deliveries)} ${lead.deliveries === 1 ? "delivery" : "deliveries"}, order to receipt`;
}

const missingText = (historyDays: number, deliveries: number, minDays: number, minDeliveries: number): string => {
  const missing: string[] = [];
  if (historyDays < minDays) missing.push(`${formatInteger(historyDays)} of ${minDays} days of history`);
  if (deliveries < minDeliveries) missing.push(`${formatInteger(deliveries)} of ${minDeliveries} deliveries received`);
  return `Not enough history yet: ${missing.join(", ")}`;
};

/** The suggestion as a short action, or what is missing before one can be made. */
export function recommendationText(recommendation: Recommendation, currentLevel: number, minDays: number, minDeliveries: number): string {
  switch (recommendation.kind) {
    case "ok": {
      const { level } = recommendation;
      if (level === currentLevel) return `Keep the reorder level at ${formatInteger(level)}`;
      return `${level > currentLevel ? "Raise" : "Lower"} the reorder level from ${formatInteger(currentLevel)} to ${formatInteger(level)}`;
    }
    case "no-sales":
      return "No recent sales to base a suggestion on";
    case "not-enough":
      return missingText(recommendation.historyDays, recommendation.deliveries, minDays, minDeliveries);
  }
}

// ---------- gross profit ----------

/** Gross profit for a tile: "—" when units sold have no cost to subtract. */
export function profitValue(sales: SaleTotals): string {
  return sales.units !== 0 && sales.profitBase === 0 ? "—" : formatMoney(sales.profit);
}

export function profitHint(sales: SaleTotals, change: SalesChange, periodDays: number): string {
  if (sales.units === 0) return "No sales in this period";
  const margin = marginOf(sales);
  if (margin === null) return "Set a cost in Part Settings to see the profit";
  return `${formatShare(margin)} margin. ${describeChange(change, periodDays)}`;
}

/** A note when some units are missing from the profit because they had no cost. */
export function uncostedNote(sales: SaleTotals): string {
  if (sales.uncosted === 0) return "";
  const n = sales.uncosted;
  return `${formatInteger(n)} ${n === 1 ? "unit has" : "units have"} no cost and ${n === 1 ? "is" : "are"} not in the profit. Set a cost in Part Settings.`;
}

// ---------- what to do ----------

const ORDER_STATE_TEXT: Record<string, string> = {
  Pending: "Order placed, waiting for the dealer to accept it",
  Accepted: "Order accepted, waiting for the dealer to dispatch it",
  Dispatched: "Order on its way: mark it received when it arrives",
};

export function whatToDoText(action: Action, minDays: number, minDeliveries: number): string {
  switch (action.kind) {
    case "scan":
      return "Scan the shelf to count this part";
    case "waiting":
      return ORDER_STATE_TEXT[action.state] ?? "Order placed, waiting for delivery";
    case "due":
      return "At the reorder level: an order is raised after two low scans";
    case "adjust":
      return `${action.direction === "raise" ? "Raise" : "Lower"} the reorder level to ${formatInteger(action.level)}`;
    case "no-sales":
      return "No recent sales to base a decision on";
    case "not-enough":
      return missingText(action.historyDays, action.deliveries, minDays, minDeliveries);
    case "ok":
      return "OK: stock and reorder level fit the sales";
  }
}

/** The badge that carries the action's urgency as icon plus text, never colour alone. */
export function whatToDoKind(action: Action): BadgeKind {
  switch (action.kind) {
    case "due":
      return "warning";
    case "waiting":
    case "adjust":
      return "info";
    case "ok":
      return "success";
    default:
      return "neutral";
  }
}

/** The short label on the badge. */
export function whatToDoLabel(action: Action): string {
  switch (action.kind) {
    case "scan":
      return "Scan Needed";
    case "waiting":
      return "Order Open";
    case "due":
      return "Order Due";
    case "adjust":
      return action.direction === "raise" ? "Raise Level" : "Lower Level";
    case "no-sales":
      return "No Sales";
    case "not-enough":
      return "Too Early";
    case "ok":
      return "OK";
  }
}
