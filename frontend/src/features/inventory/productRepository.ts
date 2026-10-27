import { collection, doc, onSnapshot, runTransaction, type Unsubscribe } from "firebase/firestore";
import { db } from "../../firebase";
import { parseProduct } from "./productParsers";
import { nextPosCount, StockError } from "./stock";
import type { Product } from "./types";

export function subscribeProducts(onData: (products: Product[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(
    collection(db, "products"),
    (snap) => onData(snap.docs.map((d) => parseProduct(d.id, d.data())).filter((p): p is Product => p !== null)),
    onError,
  );
}

/**
 * Changes a product's POS count by `delta` and returns the new value. A transaction keeps two quick
 * clicks from overwriting each other; the rules still enforce the same limits server side.
 */
export function adjustPosCount(productId: string, delta: number): Promise<number> {
  const ref = doc(db, "products", productId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new StockError("not_found");
    const current = parseProduct(snap.id, snap.data())?.posCount;
    if (current === undefined) throw new StockError("invalid_record");
    const next = nextPosCount(current, delta);
    tx.update(ref, { posCount: next });
    return next;
  });
}
