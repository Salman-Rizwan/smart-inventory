import { collection, doc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc, type Unsubscribe } from "firebase/firestore";
import { db } from "../../firebase";
import { parseOrder } from "./orderParsers";
import type { OrderAction } from "./orderWorkflow";
import type { Order } from "./types";

const MAX_ORDERS = 200;

/** The most recent orders, live. Sorting and filtering happen in the UI. */
export function subscribeOrders(onData: (orders: Order[]) => void, onError: (error: unknown) => void): Unsubscribe {
  const recent = query(collection(db, "purchase_orders"), orderBy("createdAt", "desc"), limit(MAX_ORDERS));
  return onSnapshot(
    recent,
    (snap) => onData(snap.docs.map((d) => parseOrder(d.id, d.data())).filter((o): o is Order => o !== null)),
    onError,
  );
}

/** Moves an order one step forward. The rules allow only the next step, with a server timestamp. */
export function advanceOrder(orderId: string, action: OrderAction): Promise<void> {
  return updateDoc(doc(db, "purchase_orders", orderId), {
    state: action.next,
    [action.timestampField]: serverTimestamp(),
  });
}
