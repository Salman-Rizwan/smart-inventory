import { formatInteger, formatSigned } from "../../shared/format";
import { adjustedPosCount, nextPosCount, receiptPosCount, StockError } from "./stock";
import type { Product } from "./types";

/**
 * Stock change log (stock_movements): one entry per POS change, written in the same transaction as
 * the change, so the log can never disagree with the POS. firestore.rules checks every field below.
 * Reset entries are written only by the backend scripts (demo_reset, seed_products --reset).
 */
export type MovementType = "Sale" | "Receipt" | "OrderReceived" | "Adjustment" | "Reset";

export type AdjustmentReason = "Damaged" | "LostOrStolen" | "Miscount" | "Found" | "CustomerReturn";

export const DECREASE_REASONS: readonly AdjustmentReason[] = ["Damaged", "LostOrStolen", "Miscount"];
export const INCREASE_REASONS: readonly AdjustmentReason[] = ["Found", "CustomerReturn", "Miscount"];

export const REASON_LABELS: Record<AdjustmentReason, string> = {
  Damaged: "Damaged",
  LostOrStolen: "Lost or Stolen",
  Miscount: "Miscount",
  Found: "Found",
  CustomerReturn: "Customer Return",
};

export const MOVEMENT_LABELS: Record<MovementType, string> = {
  Sale: "Sale",
  Receipt: "Stock Received",
  OrderReceived: "Order Received",
  Adjustment: "Adjustment",
  Reset: "Demo Reset",
};

/** The reasons that fit a change: a write-off for fewer units, a find or a return for more. */
export const reasonsFor = (change: number): readonly AdjustmentReason[] =>
  change < 0 ? DECREASE_REASONS : change > 0 ? INCREASE_REASONS : [];

export type MovementInput =
  | { type: "Sale" }
  | { type: "Receipt"; qty: number }
  | { type: "Adjustment"; target: number; reason: AdjustmentReason }
  | { type: "OrderReceived"; orderId: string; qty: number };

/** The log entry as written, apart from its server timestamp (`at`). */
export interface MovementFields {
  product: string;
  type: Exclude<MovementType, "Reset">;
  change: number;
  posBefore: number;
  posAfter: number;
  unitCost: number | null;
  unitPrice: number | null;
  by: string;
  reason?: AdjustmentReason;
  orderId?: string;
}

/**
 * Plans one POS change and its log entry from the product as read inside the transaction. Pure, so
 * every case is unit-tested. Throws StockError when the change is not allowed. The entry copies the
 * part's cost and price at this moment, so a later price change never rewrites past figures.
 */
export function planMovement(product: Product, input: MovementInput, uid: string): MovementFields {
  const before = product.posCount;
  let after: number;
  switch (input.type) {
    case "Sale":
      after = nextPosCount(before, -1);
      break;
    case "Receipt":
      if (input.qty < 1) throw new StockError("invalid_quantity");
      after = nextPosCount(before, input.qty);
      break;
    case "OrderReceived":
      after = receiptPosCount(before, input.qty);
      break;
    case "Adjustment":
      after = adjustedPosCount(before, input.target);
      if (!reasonsFor(after - before).includes(input.reason)) throw new StockError("invalid_reason");
      break;
  }
  const fields: MovementFields = {
    product: product.id,
    type: input.type,
    change: after - before,
    posBefore: before,
    posAfter: after,
    unitCost: product.unitCost,
    unitPrice: product.unitPrice,
    by: uid,
  };
  if (input.type === "Adjustment") fields.reason = input.reason;
  if (input.type === "OrderReceived") fields.orderId = input.orderId;
  return fields;
}

/** What a change does to the POS record, in words: "POS record 4 → 3 (−1)". */
export const describeChange = (before: number, after: number): string =>
  `POS record ${formatInteger(before)} → ${formatInteger(after)} (${formatSigned(after - before)})`;
