import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hooks", () => ({ useScanningSettings: vi.fn() }));
vi.mock("./scanningRepository", () => ({ PAUSE_MINUTES: 15, pauseScanning: vi.fn(), resumeScanning: vi.fn() }));

import type { ScanStatus } from "./cameraState";
import CameraStatus from "./CameraStatus";
import { useScanningSettings } from "./hooks";
import { pauseScanning, resumeScanning } from "./scanningRepository";

const NOW = new Date("2026-11-11T09:00:00Z");
const ago = (s: number) => new Date(NOW.getTime() - s * 1000);
const live = (over: Partial<ScanStatus> = {}): ScanStatus => ({
  scannedAt: ago(10),
  lastAttemptAt: ago(10),
  lastOutcome: "counted",
  skipReason: null,
  lastError: null,
  autoScan: { enabled: true, intervalSeconds: 30 },
  ...over,
});
const paused = (until: Date | null) =>
  vi.mocked(useScanningSettings).mockReturnValue({ data: { pausedUntil: until }, error: "", loading: false });

describe("CameraStatus", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true, now: NOW });
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    paused(null);
  });
  afterEach(() => vi.useRealTimers());

  it("shows a live scanner as icon plus text with the last scan", () => {
    render(<CameraStatus status={live()} />);
    expect(screen.getByText("Scanning Every 30 s")).toBeInTheDocument();
    expect(screen.getByText(/Last scan .*\(10 seconds ago\)/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Camera Status" })).toBeInTheDocument();
  });

  it("turns into No Recent Scan by itself as time passes, and announces that once", async () => {
    render(<CameraStatus status={live()} />);
    expect(screen.getByRole("status")).toHaveTextContent("");
    await act(async () => vi.advanceTimersByTime(90_000));
    expect(screen.getByText("No Recent Scan")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(/No Recent Scan\. No scan for .*laptop is awake/);
  });

  it("pauses for 15 minutes", async () => {
    vi.mocked(pauseScanning).mockResolvedValue(new Date(NOW.getTime() + 900_000));
    render(<CameraStatus status={live()} />);
    await userEvent.click(screen.getByRole("button", { name: "Pause Scanning (15 Min)" }));
    expect(pauseScanning).toHaveBeenCalled();
  });

  it("shows a pause with its end time and offers Resume", async () => {
    paused(new Date(NOW.getTime() + 600_000));
    vi.mocked(resumeScanning).mockResolvedValue();
    render(<CameraStatus status={live({ lastAttemptAt: ago(300) })} />);
    expect(screen.getByText("Scanning Paused")).toBeInTheDocument(); // not "No Recent Scan": it is paused on purpose
    expect(screen.getByText(/Resumes by itself at/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Resume Scanning" }));
    expect(resumeScanning).toHaveBeenCalled();
  });

  it("offers no pause when automatic scanning is off", () => {
    render(<CameraStatus status={live({ autoScan: { enabled: false, intervalSeconds: 30 } })} />);
    expect(screen.getByText("Automatic Scanning Off")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pause/ })).not.toBeInTheDocument();
  });

  it.each([
    ["Camera Not Responding", { lastOutcome: "failed" as const, lastError: "camera_unavailable" }],
    ["Too Dark to Count", { lastOutcome: "skipped" as const, skipReason: "too_dark" }],
  ])("shows %s", (label, over) => {
    render(<CameraStatus status={live(over)} />);
    expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("explains a refused pause with a next step", async () => {
    vi.mocked(pauseScanning).mockRejectedValue({ code: "permission-denied" });
    render(<CameraStatus status={live()} />);
    await userEvent.click(screen.getByRole("button", { name: "Pause Scanning (15 Min)" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Only a shopkeeper can pause scanning/);
  });

  it("waits for a first scan when there is no status yet", () => {
    render(<CameraStatus status={null} />);
    expect(screen.getByText("Waiting for First Scan")).toBeInTheDocument();
  });
});
