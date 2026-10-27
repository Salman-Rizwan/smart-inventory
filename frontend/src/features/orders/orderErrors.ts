/** User-facing message with a next step. Never exposes raw error text. */
export function orderErrorMessage(error: unknown, orderLabel: string): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "permission-denied") {
    return `Order ${orderLabel} could not be updated. It may already have moved on, or your account may not have permission. Refresh the page and try again.`;
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return "Could not reach the database. Check your connection and try again.";
  }
  return `Order ${orderLabel} could not be updated. Please try again.`;
}
