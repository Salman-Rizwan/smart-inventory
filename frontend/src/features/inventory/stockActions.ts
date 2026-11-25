import type { AdjustmentReason } from "./movements";
import { changeStock } from "./productRepository";

/** Simulated POS transactions. Each resolves to the new POS count and is logged in stock_movements. */
export const recordSale = (productId: string): Promise<number> => changeStock(productId, { type: "Sale" });

export const receiveStock = (productId: string, quantity: number): Promise<number> =>
  changeStock(productId, { type: "Receipt", qty: quantity });

/** Sets the POS record to a count the shopkeeper made, with the reason for the difference. */
export const adjustStock = (productId: string, target: number, reason: AdjustmentReason): Promise<number> =>
  changeStock(productId, { type: "Adjustment", target, reason });
