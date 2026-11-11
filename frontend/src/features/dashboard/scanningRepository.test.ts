import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase", () => ({ db: {} }));
vi.mock("../../shared/currentUser", () => ({ currentUid: () => "shop-uid" }));
vi.mock("firebase/firestore", () => ({
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  onSnapshot: vi.fn(),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
  setDoc: vi.fn(),
  Timestamp: { fromDate: (d: Date) => ({ toDate: () => d, iso: d.toISOString() }) },
}));

import { setDoc } from "firebase/firestore";
import { parseScanningSettings, pauseScanning, resumeScanning } from "./scanningRepository";

describe("scanningRepository", () => {
  beforeEach(() => vi.clearAllMocks());

  it("pauses for 15 minutes, stamped with who and the server's time", async () => {
    const now = new Date("2026-11-11T09:00:00Z");
    const until = await pauseScanning(now);
    expect(until.toISOString()).toBe("2026-11-11T09:15:00.000Z");
    expect(setDoc).toHaveBeenCalledWith(
      { collection: "settings", id: "scanning" },
      { pausedUntil: expect.objectContaining({ iso: "2026-11-11T09:15:00.000Z" }), pausedBy: "shop-uid", pausedAt: "SERVER_TIME" },
    );
  });

  it("resumes by clearing the end time", async () => {
    await resumeScanning();
    expect(setDoc).toHaveBeenCalledWith(
      { collection: "settings", id: "scanning" },
      { pausedUntil: null, pausedBy: "shop-uid", pausedAt: "SERVER_TIME" },
    );
  });

  it("reads a missing or malformed setting as not paused", () => {
    const d = new Date("2026-11-11T09:15:00Z");
    expect(parseScanningSettings({ pausedUntil: { toDate: () => d } })).toEqual({ pausedUntil: d });
    expect(parseScanningSettings(undefined)).toEqual({ pausedUntil: null });
    expect(parseScanningSettings({ pausedUntil: "soon" })).toEqual({ pausedUntil: null });
  });
});
