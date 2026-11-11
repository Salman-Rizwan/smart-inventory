import type { Product, StockRow, StockState } from "./types";

/** The reconciliation rule. The backend applies the same rule (app/reconcile.py) on every scan. */
export function stockState(visual: number | null, pos: number): StockState {
  if (visual === null) return "unscanned";
  return visual === pos ? "matched" : "mismatch";
}

/** How many parts the camera counted differently from the POS record (parts not yet scanned are left out). */
export function countMismatches(products: Product[], counts: Record<string, number> | null): number {
  return buildStockRows(products, counts).filter((row) => row.state === "mismatch").length;
}

export function buildStockRows(products: Product[], counts: Record<string, number> | null): StockRow[] {
  return products
    .map((product): StockRow => {
      const visual = counts && Object.hasOwn(counts, product.id) ? counts[product.id] : null;
      return {
        product,
        visual,
        difference: visual === null ? null : visual - product.posCount,
        state: stockState(visual, product.posCount),
      };
    })
    .sort((a, b) => a.product.name.localeCompare(b.product.name));
}
