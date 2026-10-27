export interface Product {
  id: string; // equals the model's class name, e.g. "spark_plug"
  name: string;
  posCount: number;
  reorderLevel: number;
  reorderQty: number;
}

export type StockState = "matched" | "mismatch" | "unscanned";

export interface StockRow {
  product: Product;
  visual: number | null; // camera count; null until a scan has reported this part
  difference: number | null; // shelf minus POS
  state: StockState;
}
