import { toDate } from "../../shared/firestoreDate";
import type { AdjustmentReason, MovementType } from "../inventory/movements";
import type { Movement, OrderTiming } from "./types";

const TYPES: readonly MovementType[] = ["Sale", "Receipt", "OrderReceived", "Adjustment", "Reset"];
const REASONS: readonly AdjustmentReason[] = ["Damaged", "LostOrStolen", "Miscount", "Found", "CustomerReturn"];

const isInteger = (value: unknown): value is number => typeof value === "number" && Number.isInteger(value);
const isCount = (value: unknown): value is number => isInteger(value) && value >= 0;
const money = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;

/** Validates a stock_movements/{id} document. Returns null for a malformed one, which is then left out. */
export function parseMovement(id: string, data: Record<string, unknown> | undefined): Movement | null {
  if (!data) return null;
  if (typeof data.product !== "string" || !data.product) return null;
  if (!TYPES.includes(data.type as MovementType)) return null;
  if (!isInteger(data.change) || !isCount(data.posBefore) || !isCount(data.posAfter)) return null;
  const at = toDate(data.at);
  if (!at) return null; // still pending (a write not yet acknowledged) or missing: not in the history yet
  return {
    id,
    product: data.product,
    type: data.type as MovementType,
    change: data.change,
    posBefore: data.posBefore,
    posAfter: data.posAfter,
    unitCost: money(data.unitCost),
    unitPrice: money(data.unitPrice),
    reason: REASONS.includes(data.reason as AdjustmentReason) ? (data.reason as AdjustmentReason) : null,
    orderId: typeof data.orderId === "string" && data.orderId ? data.orderId : null,
    at,
    by: typeof data.by === "string" ? data.by : "",
    seeded: data.seeded === true,
  };
}

/** The timing fields of a purchase_orders/{id} document. Returns null for a malformed one. */
export function parseOrderTiming(id: string, data: Record<string, unknown> | undefined): OrderTiming | null {
  if (!data) return null;
  if (typeof data.product !== "string" || !data.product) return null;
  if (typeof data.state !== "string" || !data.state) return null;
  if (!isInteger(data.qty) || data.qty < 1) return null;
  return {
    id,
    product: data.product,
    qty: data.qty,
    state: data.state,
    createdAt: toDate(data.createdAt),
    receivedAt: toDate(data.receivedAt),
    seeded: data.seeded === true,
  };
}
