import { StockError } from "../inventory/stock";
import { OrderError } from "./orderWorkflow";

/** User-facing message with a next step. Never exposes raw error text. */
export function orderErrorMessage(error: unknown, orderLabel: string): string {
  if (error instanceof OrderError) {
    switch (error.code) {
      case "not_found":
        return `Order ${orderLabel} no longer exists. Refresh the page.`;
      case "not_dispatched":
        return `Order ${orderLabel} has already been received, or it has not been dispatched yet. Refresh the page.`;
      case "product_missing":
        return "The stock record for this order’s part is missing, so the quantity could not be added. Ask your administrator to add it.";
    }
  }
  if (error instanceof StockError && error.code === "too_large") {
    return `Receiving order ${orderLabel} would put the POS record above the limit of 100,000 units. Ask your administrator to check the stock record.`;
  }
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "permission-denied") {
    return `Order ${orderLabel} could not be updated. It may already have moved on, or your account may not have permission. Refresh the page and try again.`;
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return "Could not reach the database. Check your connection and try again.";
  }
  return `Order ${orderLabel} could not be updated. Please try again.`;
}
