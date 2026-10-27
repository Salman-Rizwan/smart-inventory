/** User-facing message with a next step. Never exposes raw error text. */
export function alertErrorMessage(error: unknown, partName: string): string {
  const code = (error as { code?: unknown } | null)?.code;
  if (code === "permission-denied") {
    return `The ${partName} alert could not be acknowledged. It may already be resolved, or your account may not have permission. Refresh the page and try again.`;
  }
  if (code === "unavailable" || code === "deadline-exceeded") {
    return "Could not reach the database. Check your connection and try again.";
  }
  return `The ${partName} alert could not be acknowledged. Please try again.`;
}
