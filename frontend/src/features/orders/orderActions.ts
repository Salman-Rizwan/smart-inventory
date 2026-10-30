import { advanceOrder, fetchOrder, receiveOrder } from "./orderRepository";
import { explainRefusal, type OrderAction } from "./orderWorkflow";

const isPermissionDenied = (error: unknown) => (error as { code?: unknown } | null)?.code === "permission-denied";

/**
 * Runs a role's action on an order. Receiving also updates the POS record, so it has its own transaction.
 * The rules refuse any step that is no longer next, so when two people act at once the second is refused:
 * on a refusal, look at the order once to tell "someone got there first" apart from a permission problem.
 */
export async function performOrderAction(orderId: string, action: OrderAction): Promise<void> {
  try {
    await (action.next === "Received" ? receiveOrder(orderId) : advanceOrder(orderId, action));
  } catch (error) {
    if (!isPermissionDenied(error)) throw error;
    const current = await fetchOrder(orderId).catch(() => undefined);
    throw (current === undefined ? null : explainRefusal(action, current)) ?? error;
  }
}
