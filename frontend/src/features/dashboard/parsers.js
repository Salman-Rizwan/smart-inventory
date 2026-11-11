/** Turns raw Firestore data into safe domain objects. Bad or missing fields never throw. */

/** Counts keyed by part, sorted by key: Firestore does not guarantee map key order. */
export function parseCounts(raw) {
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(
    Object.entries(raw)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([part, n]) => [part, Number.isFinite(n) && n >= 0 ? Math.trunc(n) : 0]),
  );
}

export function toDate(value) {
  if (value && typeof value.toDate === "function") return value.toDate();
  return value instanceof Date ? value : null;
}

const OUTCOMES = ["counted", "skipped", "failed"];

/** The automatic scanning settings the backend reports, or null from a backend older than M6. */
function parseAutoScan(raw) {
  if (!raw || typeof raw !== "object" || typeof raw.enabled !== "boolean") return null;
  const interval = Number.isInteger(raw.intervalSeconds) && raw.intervalSeconds > 0 ? raw.intervalSeconds : null;
  return { enabled: raw.enabled, intervalSeconds: interval };
}

export function parseStatus(data) {
  if (!data) return null;
  return {
    counts: parseCounts(data.counts),
    scannedAt: toDate(data.scannedAt),
    lastAttemptAt: toDate(data.lastAttemptAt),
    lastOutcome: OUTCOMES.includes(data.lastOutcome) ? data.lastOutcome : null,
    skipReason: typeof data.skipReason === "string" ? data.skipReason : null,
    lastError: typeof data.lastError === "string" ? data.lastError : null,
    autoScan: parseAutoScan(data.autoScan),
  };
}

export function parseScan(id, data) {
  return {
    id,
    counts: parseCounts(data?.counts),
    scannedAt: toDate(data?.scannedAt),
    inferenceMs: Number.isFinite(data?.inferenceMs) ? data.inferenceMs : null,
  };
}

/** Every part key across several count objects, sorted so table columns stay stable. */
export function partKeys(...countObjects) {
  return [...new Set(countObjects.flatMap((c) => Object.keys(c)))].sort((a, b) => a.localeCompare(b));
}
