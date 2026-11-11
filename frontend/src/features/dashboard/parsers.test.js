import { describe, expect, it } from "vitest";
import { parseCounts, parseScan, parseStatus, partKeys } from "./parsers";

const ts = (iso) => ({ toDate: () => new Date(iso) });

describe("parseCounts", () => {
  it("sorts parts by key because Firestore map order is not guaranteed", () => {
    expect(Object.keys(parseCounts({ spark_plug: 1, petrol_filter: 2 }))).toEqual(["petrol_filter", "spark_plug"]);
  });

  it("keeps valid counts and truncates decimals", () => {
    expect(parseCounts({ spark_plug: 3, petrol_filter: 1.9 })).toEqual({ spark_plug: 3, petrol_filter: 1 });
  });

  it("replaces invalid values with 0 and survives bad input", () => {
    expect(parseCounts({ a: -2, b: "x", c: null, d: NaN })).toEqual({ a: 0, b: 0, c: 0, d: 0 });
    expect(parseCounts(undefined)).toEqual({});
    expect(parseCounts("nope")).toEqual({});
  });
});

describe("parseStatus", () => {
  it("returns null when the document is missing", () => {
    expect(parseStatus(undefined)).toBeNull();
  });

  it("converts Firestore timestamps to dates", () => {
    const s = parseStatus({ counts: { spark_plug: 2 }, scannedAt: ts("2026-10-24T06:33:46Z") });
    expect(s.counts).toEqual({ spark_plug: 2 });
    expect(s.scannedAt.toISOString()).toBe("2026-10-24T06:33:46.000Z");
  });

  it("tolerates a pending server timestamp (null)", () => {
    expect(parseStatus({ counts: {}, scannedAt: null }).scannedAt).toBeNull();
  });

  it("reads the outcome of the last attempt and the scanning settings", () => {
    const s = parseStatus({
      counts: {},
      lastAttemptAt: ts("2026-11-11T09:00:00Z"),
      lastOutcome: "skipped",
      skipReason: "too_dark",
      lastError: null,
      autoScan: { enabled: true, intervalSeconds: 30 },
    });
    expect(s.lastAttemptAt.toISOString()).toBe("2026-11-11T09:00:00.000Z");
    expect([s.lastOutcome, s.skipReason, s.lastError]).toEqual(["skipped", "too_dark", null]);
    expect(s.autoScan).toEqual({ enabled: true, intervalSeconds: 30 });
  });

  it("treats a document from before automatic scanning as unknown, never as an error", () => {
    const s = parseStatus({ counts: { spark_plug: 4 }, scannedAt: ts("2026-10-31T05:46:50Z") });
    expect([s.lastAttemptAt, s.lastOutcome, s.skipReason, s.lastError, s.autoScan]).toEqual([null, null, null, null, null]);
  });

  it("ignores malformed fields", () => {
    const s = parseStatus({ lastOutcome: "exploded", skipReason: 3, autoScan: { enabled: "yes" } });
    expect([s.lastOutcome, s.skipReason, s.autoScan]).toEqual([null, null, null]);
    expect(parseStatus({ autoScan: { enabled: true, intervalSeconds: -5 } }).autoScan).toEqual({ enabled: true, intervalSeconds: null });
  });
});

describe("parseScan", () => {
  it("maps a full document", () => {
    const scan = parseScan("abc", { counts: { spark_plug: 4 }, scannedAt: ts("2026-10-24T06:00:00Z"), inferenceMs: 412 });
    expect(scan).toMatchObject({ id: "abc", counts: { spark_plug: 4 }, inferenceMs: 412 });
  });

  it("does not throw on an empty document", () => {
    expect(parseScan("x", undefined)).toEqual({ id: "x", counts: {}, scannedAt: null, inferenceMs: null });
  });
});

describe("partKeys", () => {
  it("returns the sorted union so columns are stable", () => {
    expect(partKeys({ b: 2, a: 1 }, { c: 3, b: 1 })).toEqual(["a", "b", "c"]);
  });
});
