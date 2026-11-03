import type { Product } from "./types";

/** Margin on the selling price, as a whole percentage; null until both cost and price are set. */
export function marginPercent(product: Pick<Product, "unitCost" | "unitPrice">): number | null {
  const { unitCost, unitPrice } = product;
  if (unitCost === null || unitPrice === null || unitPrice === 0) return null;
  return Math.round(((unitPrice - unitCost) / unitPrice) * 100);
}
