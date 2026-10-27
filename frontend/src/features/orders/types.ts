export type OrderState = "Pending" | "Accepted" | "Dispatched" | "Received";

/** The roles that work with orders: the dealer fulfils them, the shopkeeper confirms receipt. */
export type OrderRole = "dealer" | "shopkeeper";

export interface Order {
  id: string;
  product: string; // the model's class name, e.g. "spark_plug"
  qty: number;
  state: OrderState;
  createdAt: Date | null;
  dispatchedAt?: Date | null; // when the dealer sent it
}
