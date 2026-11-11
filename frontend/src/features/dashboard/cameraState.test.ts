import { describe, expect, it } from "vitest";
import { cameraState, describeAge, type ScanStatus } from "./cameraState";

const NOW = new Date("2026-11-11T09:00:00Z");
const ago = (s: number) => new Date(NOW.getTime() - s * 1000);
const status = (over: Partial<ScanStatus> = {}): ScanStatus => ({
  scannedAt: ago(20),
  lastAttemptAt: ago(20),
  lastOutcome: "counted",
  skipReason: null,
  lastError: null,
  autoScan: { enabled: true, intervalSeconds: 30 },
  ...over,
});

describe("cameraState", () => {
  it("is live after a recent counted scan", () => {
    const s = cameraState(status(), NOW);
    expect(s).toMatchObject({ kind: "live", badge: "success", label: "Scanning Every 30 s" });
    expect(s.detail).toMatch(/\(20 seconds ago\)\.$/);
  });

  it("waits for a first scan when there is no status", () => {
    expect(cameraState(null, NOW).kind).toBe("waiting");
    expect(cameraState(status({ scannedAt: null, lastAttemptAt: null }), NOW).kind).toBe("waiting");
  });

  it("says automatic scanning is off, and how to scan", () => {
    const s = cameraState(status({ autoScan: { enabled: false, intervalSeconds: 30 } }), NOW);
    expect(s).toMatchObject({ kind: "off", badge: "neutral" });
    expect(s.detail).toMatch(/Press Scan Now/);
  });

  it("treats a status from before automatic scanning as off, not as broken", () => {
    expect(cameraState(status({ autoScan: null, lastAttemptAt: null, lastOutcome: null }), NOW).kind).toBe("off");
  });

  it("shows a pause until it ends, then whatever is true", () => {
    expect(cameraState(status(), NOW, new Date(NOW.getTime() + 600_000))).toMatchObject({ kind: "paused", badge: "info" });
    expect(cameraState(status(), NOW, ago(1)).kind).toBe("live");
  });

  it("warns at more than twice the interval plus grace, and not before", () => {
    expect(cameraState(status({ lastAttemptAt: ago(90) }), NOW).kind).toBe("live"); // exactly 2 x 30 + 30
    const s = cameraState(status({ lastAttemptAt: ago(91) }), NOW);
    expect(s).toMatchObject({ kind: "no_scan", badge: "warning", label: "No Recent Scan" });
    expect(s.detail).toMatch(/laptop is awake and the backend is running/);
  });

  it("puts a silent scanner before an old good outcome or an old error", () => {
    expect(cameraState(status({ lastAttemptAt: ago(4 * 3600) }), NOW).detail).toMatch(/No scan for 4 hours/);
    expect(cameraState(status({ lastAttemptAt: ago(600), lastOutcome: "failed", lastError: "camera_unavailable" }), NOW).kind).toBe(
      "no_scan",
    );
  });

  it("names a camera failure with a next step", () => {
    const s = cameraState(status({ lastOutcome: "failed", lastError: "camera_unavailable" }), NOW);
    expect(s).toMatchObject({ kind: "camera", badge: "error", label: "Camera Not Responding" });
    expect(s.detail).toMatch(/webcam is connected/);
  });

  it("says when it is too dark, keeping the time of the last real count", () => {
    const s = cameraState(status({ lastOutcome: "skipped", skipReason: "too_dark", scannedAt: ago(600) }), NOW);
    expect(s).toMatchObject({ kind: "dark", badge: "warning", label: "Too Dark to Count" });
    expect(s.detail).toMatch(/Turn on the shelf light.*Last count/);
  });

  it("reports any other failure and when it retries", () => {
    const s = cameraState(status({ lastOutcome: "failed", lastError: "storage_failed" }), NOW);
    expect(s).toMatchObject({ kind: "failed", badge: "error" });
    expect(s.detail).toMatch(/tries again in 30 seconds/);
  });

  it("uses 60 s when the interval is unknown", () => {
    expect(cameraState(status({ autoScan: { enabled: true, intervalSeconds: null }, lastAttemptAt: ago(150) }), NOW).kind).toBe("live");
    expect(cameraState(status({ autoScan: { enabled: true, intervalSeconds: null }, lastAttemptAt: ago(151) }), NOW).kind).toBe(
      "no_scan",
    );
  });

  it("never shows a negative age when the browser clock is behind", () => {
    expect(cameraState(status({ lastAttemptAt: new Date(NOW.getTime() + 5000) }), NOW).detail).toMatch(/\(0 seconds ago\)/);
  });
});

describe("describeAge", () => {
  it.each([
    [1, "1 second"],
    [40, "40 seconds"],
    [89, "89 seconds"],
    [180, "3 minutes"],
    [3600, "1 hour"],
    [3660, "1 hour 1 minute"],
    [4 * 3600 + 5 * 60, "4 hours 5 minutes"],
  ])("%d seconds reads as %s", (s, text) => expect(describeAge(s)).toBe(text));
});
