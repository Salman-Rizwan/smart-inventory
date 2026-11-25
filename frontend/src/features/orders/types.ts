export type OrderState = "Pending" | "Accepted" | "Dispatched" | "Received" | "Cancelled";

/** Why the shopkeeper cancelled an order (the rules accept only these). */
export type CancelReason = "NotNeeded" | "OrderedByMistake" | "Other";

/** The roles that work with orders: the dealer fulfils them, the shopkeeper confirms receipt or cancels. */
export type OrderRole = "dealer" | "shopkeeper";

export interface Order {
  id: string;
  product: string; // the model's class name, e.g. "spark_plug"
  productName?: string | null; // the part's name when the order was raised (older orders have none)
  qty: number;
  state: OrderState;
  createdAt: Date | null;
  acceptedAt?: Date | null; // when the dealer accepted it
  dispatchedAt?: Date | null; // when the dealer sent it
  cancelledAt?: Date | null;
  cancelReason?: CancelReason | null;
}
