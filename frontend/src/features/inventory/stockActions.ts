import { adjustPosCount } from "./productRepository";

/** Simulated POS transactions. Both resolve to the new POS count. */
export const recordSale = (productId: string): Promise<number> => adjustPosCount(productId, -1);

export const receiveStock = (productId: string, quantity: number): Promise<number> =>
  adjustPosCount(productId, quantity);
