import type { BadgeKind } from "../../shared/components/StatusBadge";

/** status/latest as parsed by parseStatus (parsers.js). */
export interface ScanStatus {
  scannedAt: Date | null;
  lastAttemptAt: Date | null;
  lastOutcome: "counted" | "skipped" | "failed" | null;
  skipReason: string | null;
  lastError: string | null;
  autoScan: { enabled: boolean; intervalSeconds: number | null } | null;
}

export type CameraStateKind = "waiting" | "off" | "paused" | "no_scan" | "camera" | "dark" | "failed" | "live";

export interface CameraState {
  kind: CameraStateKind;
  badge: BadgeKind;
  label: string;
  detail: string;
}

const DEFAULT_INTERVAL = 60;
const GRACE_SECONDS = 30; // a scan takes a few seconds, and Firestore a moment to deliver it

const time = new Intl.DateTimeFormat(undefined, { timeStyle: "short" });

/** "40 seconds", "3 minutes", "2 hours 5 minutes". */
export function describeAge(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 90) return `${s} ${s === 1 ? "second" : "seconds"}`;
  const minutes = Math.round(s / 60);
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const h = `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return rest ? `${h} ${rest} ${rest === 1 ? "minute" : "minutes"}` : h;
}

/**
 * What the camera is doing, for the dashboard's status line. Pure: `now` is passed in.
 * A silent laptop is checked before the last outcome, so an old "all good" never hides a stopped scanner.
 */
export function cameraState(status: ScanStatus | null, now: Date, pausedUntil: Date | null = null): CameraState {
  const lastSeen = status?.lastAttemptAt ?? status?.scannedAt ?? null;
  if (!status || !lastSeen) {
    return { kind: "waiting", badge: "neutral", label: "Waiting for First Scan", detail: "Press Scan Now to count the shelf." };
  }
  const lastCount = status.scannedAt ? `Last count ${time.format(status.scannedAt)}.` : "No count yet.";
  if (!status.autoScan?.enabled) {
    return {
      kind: "off",
      badge: "neutral",
      label: "Automatic Scanning Off",
      detail: `${lastCount} Press Scan Now to count the shelf again.`,
    };
  }
  if (pausedUntil && pausedUntil > now) {
    return {
      kind: "paused",
      badge: "info",
      label: "Scanning Paused",
      detail: `Resumes by itself at ${time.format(pausedUntil)}, or press Resume Scanning. ${lastCount}`,
    };
  }
  const interval = status.autoScan.intervalSeconds ?? DEFAULT_INTERVAL;
  const age = (now.getTime() - lastSeen.getTime()) / 1000;
  if (age > 2 * interval + GRACE_SECONDS) {
    return {
      kind: "no_scan",
      badge: "warning",
      label: "No Recent Scan",
      detail: `No scan for ${describeAge(age)}. Check that the shop laptop is awake and the backend is running. ${lastCount}`,
    };
  }
  if (status.lastOutcome === "failed" && status.lastError === "camera_unavailable") {
    return {
      kind: "camera",
      badge: "error",
      label: "Camera Not Responding",
      detail: `Check that the webcam is connected and camera access is allowed; the next scan tries again. ${lastCount}`,
    };
  }
  if (status.lastOutcome === "skipped" && status.skipReason === "too_dark") {
    return {
      kind: "dark",
      badge: "warning",
      label: "Too Dark to Count",
      detail: `Turn on the shelf light; scans are skipped until it is bright enough. ${lastCount}`,
    };
  }
  if (status.lastOutcome === "failed") {
    return {
      kind: "failed",
      badge: "error",
      label: "Last Scan Failed",
      detail: `The next scan tries again in ${interval} seconds. If this continues, check the backend on the shop laptop. ${lastCount}`,
    };
  }
  return {
    kind: "live",
    badge: "success",
    label: `Scanning Every ${interval} s`,
    detail: `Last scan ${time.format(lastSeen)} (${describeAge(age)} ago).`,
  };
}
