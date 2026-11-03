export interface Product {
  id: string; // equals the model's class name, e.g. "spark_plug"
  name: string;
  posCount: number;
  reorderLevel: number;
  reorderQty: number;
  unitCost: number | null; // what the shop pays per unit, in the shop's currency; null until set
  unitPrice: number | null; // what the shop sells it for; null until set
}

export type StockState = "matched" | "mismatch" | "unscanned";

export interface StockRow {
  product: Product;
  visual: number | null; // camera count; null until a scan has reported this part
  difference: number | null; // shelf minus POS
  state: StockState;
}

/** The settings a shopkeeper edits in Part Settings. */
export interface PartSettings {
  unitCost: number | null;
  unitPrice: number | null;
  reorderLevel: number;
  reorderQty: number;
}
