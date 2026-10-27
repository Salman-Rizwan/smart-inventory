import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../firebase";
import { parseProduct } from "../inventory/productParsers";
import { receiptPosCount } from "../inventory/stock";
import { parseOrder } from "./orderParsers";
import { OrderError, type OrderAction } from "./orderWorkflow";
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

/**
 * The shop confirms a dispatched order arrived: marks it Received and adds its quantity to the POS
 * record, in one transaction so the two can never disagree. Receiving twice is refused.
 */
export function receiveOrder(orderId: string): Promise<void> {
  const orderRef = doc(db, "purchase_orders", orderId);
  return runTransaction(db, async (tx) => {
    const orderSnap = await tx.get(orderRef);
    const order = orderSnap.exists() ? parseOrder(orderSnap.id, orderSnap.data()) : null;
    if (!order) throw new OrderError("not_found");
    if (order.state !== "Dispatched") throw new OrderError("not_dispatched");

    const productRef = doc(db, "products", order.product);
    const productSnap = await tx.get(productRef);
    const product = productSnap.exists() ? parseProduct(productSnap.id, productSnap.data()) : null;
    if (!product) throw new OrderError("product_missing");

    const nextPos = receiptPosCount(product.posCount, order.qty);
    tx.update(orderRef, { state: "Received", receivedAt: serverTimestamp() });
    tx.update(productRef, { posCount: nextPos });
  });
}
