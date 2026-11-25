import { toDate } from "../../shared/firestoreDate";
import type { CancelReason, Order, OrderState } from "./types";

const STATES: readonly string[] = ["Pending", "Accepted", "Dispatched", "Received", "Cancelled"];
const REASONS: readonly string[] = ["NotNeeded", "OrderedByMistake", "Other"];
const text = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);
const isQuantity = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1;

/** Validates a purchase_orders/{id} document. Returns null when it is malformed. */
export function parseOrder(id: string, data: Record<string, unknown> | undefined): Order | null {
  if (!data) return null;
  if (typeof data.state !== "string" || !STATES.includes(data.state)) return null;
  if (typeof data.product !== "string" || !data.product) return null;
  if (!isQuantity(data.qty)) return null;
  return {
    id,
    product: data.product,
    productName: text(data.productName),
    qty: data.qty,
    state: data.state as OrderState,
    createdAt: toDate(data.createdAt),
    acceptedAt: toDate(data.acceptedAt),
    dispatchedAt: toDate(data.dispatchedAt),
    cancelledAt: toDate(data.cancelledAt),
    cancelReason: typeof data.cancelReason === "string" && REASONS.includes(data.cancelReason) ? (data.cancelReason as CancelReason) : null,
  };
}
