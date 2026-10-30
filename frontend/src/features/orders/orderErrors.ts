import { StockError } from "../inventory/stock";
import { OrderError } from "./orderWorkflow";
import type { OrderState } from "./types";

/** Someone else moved the order on first. The list is live, so it already shows the new status. */
function movedOnMessage(orderLabel: string, state: OrderState | undefined): string {
  switch (state) {
    case "Received":
      return `Order ${orderLabel} has already been received. Its quantity was added to the POS record once, so there is nothing more to do.`;
    case "Accepted":
    case "Dispatched":
      return `Order ${orderLabel} has already been ${state.toLowerCase()}. The list shows its latest status.`;
    default:
      return `Order ${orderLabel} has changed since you opened it, so this step no longer applies. The list shows its latest status.`;
  }
}

/** User-facing message with a next step. Never exposes raw error text. */
export function orderErrorMessage(error: unknown, orderLabel: string): string {
  if (error instanceof OrderError) {
    switch (error.code) {
      case "not_found":
        return `Order ${orderLabel} no longer exists. Refresh the page.`;
      case "moved_on":
        return movedOnMessage(orderLabel, error.state);
      case "product_missing":
        return "The stock record for this order’s part is missing, so the quantity could not be added. Ask your administrator to add it.";
    }
  }
  if (error instanceof StockError && error.code === "too_large") {
    return `Receiving order ${orderLabel} would put the POS record above the limit of 100,000 units. Ask your administrator to check the stock record.`;
  }
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "permission-denied") {
    return `Your account was not allowed to update order ${orderLabel}. Refresh the page and try again; if it keeps happening, ask your administrator to check your account.`;
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return "Could not reach the database. Check your connection and try again.";
  }
  return `Order ${orderLabel} could not be updated. Please try again.`;
}
