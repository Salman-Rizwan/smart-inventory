import type { Order, OrderState } from "./types";

export const ORDER_STATES: readonly OrderState[] = ["Pending", "Accepted", "Dispatched", "Received"];

export interface OrderAction {
  label: string;
  next: OrderState;
  timestampField: "acceptedAt" | "dispatchedAt";
}

/** What a dealer can do to an order in each state. Dispatched and Received wait on the shop. */
export const DEALER_ACTIONS: Partial<Record<OrderState, OrderAction>> = {
  Pending: { label: "Accept Order", next: "Accepted", timestampField: "acceptedAt" },
  Accepted: { label: "Mark Dispatched", next: "Dispatched", timestampField: "dispatchedAt" },
};

export type OrderFilter = "open" | "completed" | "all";

export const FILTERS: readonly { value: OrderFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
  { value: "all", label: "All" },
];

/** Reads the filter from the URL; anything unknown falls back to Open. */
export const parseFilter = (raw: string | null): OrderFilter => (raw === "completed" || raw === "all" ? raw : "open");

export function countByState(orders: Order[]): Record<OrderState, number> {
  const counts: Record<OrderState, number> = { Pending: 0, Accepted: 0, Dispatched: 0, Received: 0 };
  for (const order of orders) counts[order.state] += 1;
  return counts;
}

export function filterOrders(orders: Order[], filter: OrderFilter): Order[] {
  if (filter === "all") return orders;
  return orders.filter((o) => (o.state === "Received") === (filter === "completed"));
}

/** An action queue: Pending first, then Accepted, Dispatched; oldest first so nothing is forgotten. Received last, newest first. */
export function sortOrders(orders: Order[]): Order[] {
  const rank = (o: Order) => ORDER_STATES.indexOf(o.state);
  const time = (o: Order) => o.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...orders].sort((a, b) => {
    if (rank(a) !== rank(b)) return rank(a) - rank(b);
    return a.state === "Received" ? time(b) - time(a) : time(a) - time(b);
  });
}

export const shortId = (id: string): string => `#${id.slice(0, 6).toUpperCase()}`;

export function describePending(pending: number): string {
  if (pending === 0) return "No pending orders.";
  return `${pending} pending ${pending === 1 ? "order" : "orders"}.`;
}
