import { StockError } from "./stock";

/** User-facing message with a next step. Never exposes raw error text. */
export function stockErrorMessage(error: unknown, partName: string): string {
  if (error instanceof StockError) {
    switch (error.code) {
      case "insufficient":
        return `The ${partName} POS record is already 0, so no more sales can be recorded. Receive stock first, or check the shelf.`;
      case "too_large":
        return `That would put ${partName} above the limit of 100,000 units. Enter a smaller quantity.`;
      case "invalid_quantity":
        return "Enter a whole number from 1 to 999.";
      case "not_found":
        return `No stock record exists for ${partName}. Ask your administrator to add it.`;
      case "invalid_record":
        return `The stock record for ${partName} is damaged. Ask your administrator to check it.`;
    }
  }
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "permission-denied") {
    return "You don’t have permission to change stock records. Sign in as a shopkeeper and try again.";
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return "Could not reach the database. Check your connection and try again.";
  }
  return `The ${partName} stock record could not be updated. Please try again.`;
}
