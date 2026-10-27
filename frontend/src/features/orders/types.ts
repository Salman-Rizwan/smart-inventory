export type OrderState = "Pending" | "Accepted" | "Dispatched" | "Received";

export interface Order {
  id: string;
  product: string; // the model's class name, e.g. "spark_plug"
  qty: number;
  state: OrderState;
  createdAt: Date | null;
}
