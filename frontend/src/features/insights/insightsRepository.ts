import { collection, onSnapshot, orderBy, query, where, type QuerySnapshot, type Unsubscribe } from "firebase/firestore";
import { db } from "../../firebase";
import { parseMovement, parseOrderTiming } from "./parsers";
import type { Movement, OrderTiming } from "./types";

/*
 * Live reads for Insights. Each query filters on one time field only, so no composite index is
 * needed, and the period, part filter and previous-period comparison are cut from the loaded window
 * in memory (analytics.ts). Malformed documents are left out rather than failing the page.
 */

function parseAll<T>(snap: QuerySnapshot, parse: (id: string, data: Record<string, unknown>) => T | null): T[] {
  return snap.docs.map((d) => parse(d.id, d.data())).filter((item): item is T => item !== null);
}

/** Every stock change since `since`, oldest first. The browser's own pending writes join once acknowledged. */
export function subscribeMovementsSince(
  since: Date,
  onData: (movements: Movement[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  const recent = query(collection(db, "stock_movements"), where("at", ">=", since), orderBy("at"));
  return onSnapshot(recent, (snap) => onData(parseAll(snap, parseMovement)), onError);
}

/** Every purchase order raised since `since`, oldest first, for the lead-time figures. */
export function subscribeOrdersSince(
  since: Date,
  onData: (orders: OrderTiming[]) => void,
  onError: (error: unknown) => void,
): Unsubscribe {
  const recent = query(collection(db, "purchase_orders"), where("createdAt", ">=", since), orderBy("createdAt"));
  return onSnapshot(recent, (snap) => onData(parseAll(snap, parseOrderTiming)), onError);
}
