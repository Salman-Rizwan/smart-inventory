import type { Order, OrderRole, OrderState } from "./types";

export const ORDER_STATES: readonly OrderState[] = ["Pending", "Accepted", "Dispatched", "Received"];

export interface OrderAction {
  label: string;
  next: OrderState;
  timestampField: "acceptedAt" | "dispatchedAt" | "receivedAt";
}

/** What each role can do to an order in each state. The rules in firestore.rules allow exactly these moves. */
const ACTIONS: Record<OrderRole, Partial<Record<OrderState, OrderAction>>> = {
  dealer: {
    Pending: { label: "Accept Order", next: "Accepted", timestampField: "acceptedAt" },
    Accepted: { label: "Mark Dispatched", next: "Dispatched", timestampField: "dispatchedAt" },
  },
  shopkeeper: {
    Dispatched: { label: "Mark Received", next: "Received", timestampField: "receivedAt" },
  },
};

export const actionFor = (role: OrderRole, state: OrderState): OrderAction | undefined => ACTIONS[role][state];

/** The state in which an order is waiting for this role to act. */
export const attentionState = (role: OrderRole): OrderState => (role === "dealer" ? "Pending" : "Dispatched");

export type OrderErrorCode = "not_found" | "not_dispatched" | "product_missing";

export class OrderError extends Error {
  readonly code: OrderErrorCode;

  constructor(code: OrderErrorCode) {
    super(code);
    this.name = "OrderError";
    this.code = code;
  }
}

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

/**
 * An action queue for the role: orders waiting for them first, then the others in lifecycle order,
 * Received last. Open orders show the oldest first so nothing is forgotten; Received shows newest first.
 */
export function sortOrders(orders: Order[], role: OrderRole = "dealer"): Order[] {
  const attention = attentionState(role);
  const priority: OrderState[] = [
    attention,
    ...ORDER_STATES.filter((s) => s !== attention && s !== "Received"),
    "Received",
  ];
  const time = (o: Order) => o.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...orders].sort((a, b) => {
    const byState = priority.indexOf(a.state) - priority.indexOf(b.state);
    if (byState !== 0) return byState;
    return a.state === "Received" ? time(b) - time(a) : time(a) - time(b);
  });
}

export const shortId = (id: string): string => `#${id.slice(0, 6).toUpperCase()}`;

/** For screen readers: how many orders are waiting for this role. */
export function describeAttention(role: OrderRole, count: number): string {
  const noun = count === 1 ? "order" : "orders";
  if (role === "dealer") return count === 0 ? "No pending orders." : `${count} pending ${noun}.`;
  return count === 0 ? "No orders waiting to be received." : `${count} ${noun} waiting to be received.`;
}

/** What just happened, in words the user can act on. */
export function describeOutcome(action: OrderAction, orderLabel: string, quantity: number, partName: string): string {
  switch (action.next) {
    case "Accepted":
      return `Order ${orderLabel} accepted. The shop can see you are preparing it.`;
    case "Dispatched":
      return `Order ${orderLabel} marked as dispatched. The shop will see it as on the way.`;
    default:
      return `Order ${orderLabel} received. ${quantity} × ${partName} added to the POS record.`;
  }
}
