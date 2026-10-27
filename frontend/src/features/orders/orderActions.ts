import { advanceOrder, receiveOrder } from "./orderRepository";
import type { OrderAction } from "./orderWorkflow";

/** Runs a role's action on an order. Receiving also updates the POS record, so it has its own transaction. */
export function performOrderAction(orderId: string, action: OrderAction): Promise<void> {
  return action.next === "Received" ? receiveOrder(orderId) : advanceOrder(orderId, action);
}
