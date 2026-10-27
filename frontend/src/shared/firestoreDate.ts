/** A Firestore Timestamp (or anything with toDate) as a Date; null when absent or still pending. */
export function toDate(value: unknown): Date | null {
  const candidate = value as { toDate?: () => Date } | null | undefined;
  return candidate && typeof candidate.toDate === "function" ? candidate.toDate() : null;
}
