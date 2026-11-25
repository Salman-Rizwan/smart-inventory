import {
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  updateDoc,
  type Transaction,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "../../firebase";
import { currentUid, SignedOutError } from "../../shared/currentUser";
import { planMovement, type MovementInput } from "./movements";
import { parseProduct } from "./productParsers";
import { StockError } from "./stock";
import type { PartSettings, Product } from "./types";

export function subscribeProducts(onData: (products: Product[]) => void, onError: (error: unknown) => void): Unsubscribe {
  return onSnapshot(
    collection(db, "products"),
    (snap) => onData(snap.docs.map((d) => parseProduct(d.id, d.data())).filter((p): p is Product => p !== null)),
    onError,
  );
}

function uidOrStockError(): string {
  try {
    return currentUid();
  } catch (error) {
    if (error instanceof SignedOutError) throw new StockError("signed_out");
    throw error;
  }
}

/**
 * Writes one POS change and its stock_movements entry inside `tx`, and returns the new POS count.
 * The product names the entry in lastMovementId, which is how the rules tie the two together.
 * `product` must have been read in the same transaction.
 */
export function writeMovement(tx: Transaction, product: Product, input: MovementInput, uid: string): number {
  const fields = planMovement(product, input, uid);
  const movementRef = doc(collection(db, "stock_movements"));
  tx.set(movementRef, { ...fields, at: serverTimestamp() });
  tx.update(doc(db, "products", product.id), { posCount: fields.posAfter, lastMovementId: movementRef.id });
  return fields.posAfter;
}

/**
 * Changes a product's POS count and logs the change, in one transaction, and returns the new value.
 * The transaction keeps two quick clicks from overwriting each other; the rules enforce the same
 * limits server side.
 */
export function changeStock(productId: string, input: MovementInput): Promise<number> {
  const uid = uidOrStockError();
  const ref = doc(db, "products", productId);
  return runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new StockError("not_found");
    const product = parseProduct(snap.id, snap.data());
    if (!product) throw new StockError("invalid_record");
    return writeMovement(tx, product, input, uid);
  });
}

/** Saves a part's cost, price and reorder settings, stamped with who changed them and when. */
export function savePartSettings(productId: string, settings: PartSettings): Promise<void> {
  const uid = uidOrStockError();
  return updateDoc(doc(db, "products", productId), { ...settings, updatedBy: uid, updatedAt: serverTimestamp() });
}
