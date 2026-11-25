/** Read keys live in one Firestore document per user; the rules cap it at MAX_READ_KEYS. */
export const MAX_READ_KEYS = 500;
export const PRUNE_THRESHOLD = 400; // tidy up before the cap is reached
const KEEP_INACTIVE = 100; // recently read keys kept even once their item is gone

/**
 * Drops the read keys of items that no longer exist, keeping the most recent ones and every key that
 * is still active, in their original order. Resolved alerts and handled orders leave stale keys behind.
 */
export function pruneKeys(keys: string[], activeKeys: ReadonlySet<string>): string[] {
  const keep = new Set(keys.filter((k) => activeKeys.has(k)));
  for (const key of keys.filter((k) => !activeKeys.has(k)).slice(-KEEP_INACTIVE)) keep.add(key);
  return keys.filter((k) => keep.has(k));
}
