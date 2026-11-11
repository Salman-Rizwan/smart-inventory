import { partLabel } from "../dashboard/parts";
import type { CancelReason, Order, OrderRole, OrderState } from "./types";

/** The lifecycle in order; Cancelled is a second end state, reachable from Pending or Accepted. */
export const ORDER_STATES: readonly OrderState[] = ["Pending", "Accepted", "Dispatched", "Received", "Cancelled"];

/** Received and Cancelled orders are finished: nobody has anything left to do on them. */
export const isClosed = (state: OrderState): boolean => state === "Received" || state === "Cancelled";

/**
 * The part's name as stored on the order when it was raised, so the dealer (who cannot read the
 * shop's stock records) sees the same name as the shop. Older orders fall back to the class name.
 */
export const orderPartName = (order: Order): string => order.productName || partLabel(order.product);

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

/** The shopkeeper may cancel an order the dealer has not dispatched yet; goods on the way are received. */
export const canCancel = (role: OrderRole, state: OrderState): boolean =>
  role === "shopkeeper" && (state === "Pending" || state === "Accepted");

export const CANCEL_REASONS: readonly CancelReason[] = ["NotNeeded", "OrderedByMistake", "Other"];

export const CANCEL_REASON_LABELS: Record<CancelReason, string> = {
  NotNeeded: "Not needed any more",
  OrderedByMistake: "Ordered by mistake",
  Other: "Other reason",
};

/** The state in which an order is waiting for this role to act. */
export const attentionState = (role: OrderRole): OrderState => (role === "dealer" ? "Pending" : "Dispatched");

export type OrderErrorCode = "not_found" | "moved_on" | "product_missing";

export class OrderError extends Error {
  readonly code: OrderErrorCode;
  /** For "moved_on": the state the order is in now. */
  readonly state?: OrderState;

  constructor(code: OrderErrorCode, state?: OrderState) {
    super(code);
    this.name = "OrderError";
    this.code = code;
    this.state = state;
  }
}

/**
 * Why the rules refused an order step, judged from the order as it is now. An order already at or
 * past the requested step has moved on (someone got there first); a missing one was deleted. Null
 * means it has not moved, so the refusal was about the account's permission.
 */
export function explainRefusal(action: OrderAction, current: Order | null): OrderError | null {
  if (!current) return new OrderError("not_found");
  if (ORDER_STATES.indexOf(current.state) >= ORDER_STATES.indexOf(action.next)) {
    return new OrderError("moved_on", current.state);
  }
  return null;
}

/** Why the rules refused a cancel: the order is gone, or it has moved past Accepted (or was cancelled already). */
export function explainCancelRefusal(current: Order | null): OrderError | null {
  if (!current) return new OrderError("not_found");
  if (!canCancel("shopkeeper", current.state)) return new OrderError("moved_on", current.state);
  return null;
}

export type OrderFilter = "open" | "closed" | "all";

export const FILTERS: readonly { value: OrderFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
  { value: "all", label: "All" },
];

/** Reads the filter from the URL; "completed" (the old name for Closed) still works; anything else is Open. */
export function parseFilter(raw: string | null): OrderFilter {
  if (raw === "closed" || raw === "completed") return "closed";
  return raw === "all" ? "all" : "open";
}

export function countByState(orders: Order[]): Record<OrderState, number> {
  const counts: Record<OrderState, number> = { Pending: 0, Accepted: 0, Dispatched: 0, Received: 0, Cancelled: 0 };
  for (const order of orders) counts[order.state] += 1;
  return counts;
}

export function filterOrders(orders: Order[], filter: OrderFilter): Order[] {
  if (filter === "all") return orders;
  return orders.filter((o) => isClosed(o.state) === (filter === "closed"));
}

/**
 * An action queue for the role: orders waiting for them first, then the other open ones in lifecycle
 * order, then the closed ones together. Open orders show the oldest first so nothing is forgotten;
 * closed ones show the newest first.
 */
export function sortOrders(orders: Order[], role: OrderRole = "dealer"): Order[] {
  const attention = attentionState(role);
  const open = ORDER_STATES.filter((s) => !isClosed(s));
  const priority: OrderState[] = [attention, ...open.filter((s) => s !== attention)];
  const rank = (o: Order) => (isClosed(o.state) ? priority.length : priority.indexOf(o.state));
  const time = (o: Order) => o.createdAt?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...orders].sort((a, b) => {
    const byState = rank(a) - rank(b);
    if (byState !== 0) return byState;
    return isClosed(a.state) ? time(b) - time(a) : time(a) - time(b);
  });
}

export const shortId = (id: string): string => `#${id.slice(0, 6).toUpperCase()}`;

/** For screen readers: how many orders are waiting for this role. */
export function describeAttention(role: OrderRole, count: number): string {
  const noun = count === 1 ? "order" : "orders";
  if (role === "dealer") return count === 0 ? "No pending orders." : `${count} pending ${noun}.`;
  return count === 0 ? "No orders waiting to be received." : `${count} ${noun} waiting to be received.`;
}

/**
 * After a cancel: the camera still decides when to order, so say what happens if the part stays low
 * and how to stop it.
 */
export function describeCancelled(orderLabel: string, partName: string): string {
  return `Order ${orderLabel} cancelled. The dealer sees it as cancelled. If ${partName} stays low on the shelf, a new order is raised automatically; to stop that, lower its reorder level or set its reorder quantity to 0 in Part Settings.`;
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
