import { toDate } from "../../shared/firestoreDate";
import type { Order, OrderState } from "./types";

const STATES: readonly string[] = ["Pending", "Accepted", "Dispatched", "Received"];
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
    qty: data.qty,
    state: data.state as OrderState,
    createdAt: toDate(data.createdAt),
  };
}
