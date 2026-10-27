export const MAX_RECEIVE_QTY = 999;
export const MAX_POS_COUNT = 100_000; // also enforced by firestore.rules

export type StockErrorCode = "insufficient" | "too_large" | "invalid_quantity" | "not_found" | "invalid_record";

export class StockError extends Error {
  readonly code: StockErrorCode;

  constructor(code: StockErrorCode) {
    super(code);
    this.name = "StockError";
    this.code = code;
  }
}

/** The POS count after applying `delta` (negative for a sale). Throws StockError when it would be invalid. */
export function nextPosCount(current: number, delta: number): number {
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > MAX_RECEIVE_QTY) {
    throw new StockError("invalid_quantity");
  }
  const next = current + delta;
  if (next < 0) throw new StockError("insufficient");
  if (next > MAX_POS_COUNT) throw new StockError("too_large");
  return next;
}

/** The POS count after receiving `quantity` units from a purchase order. No per-receipt cap, unlike manual entry. */
export function receiptPosCount(current: number, quantity: number): number {
  if (!Number.isInteger(quantity) || quantity < 1) throw new StockError("invalid_quantity");
  const next = current + quantity;
  if (next > MAX_POS_COUNT) throw new StockError("too_large");
  return next;
}
