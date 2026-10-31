import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: vi.fn(() => "alerts"),
  doc: vi.fn((_db: unknown, collection: string, id: string) => ({ collection, id })),
  limit: vi.fn((n: number) => ({ limit: n })),
  onSnapshot: vi.fn(),
  orderBy: vi.fn((field: string, dir: string) => ({ orderBy: field, dir })),
  query: vi.fn((...parts: unknown[]) => parts),
  serverTimestamp: vi.fn(() => "SERVER_TIME"),
  updateDoc: vi.fn(),
  where: vi.fn(),
}));

import { limit, onSnapshot, orderBy, updateDoc } from "firebase/firestore";
import { acknowledgeAlert, subscribeAlertHistory, type AlertHistoryPage } from "./alertRepository";

const doc = (id: string, state = "Resolved") => ({ id, data: () => ({ product: "spark_plug", visualCount: 3, posCount: 4, state }) });

const snapshot = (count: number, fromCache = false, extra: ReturnType<typeof doc>[] = []) => {
  const docs = [...Array.from({ length: count }, (_, i) => doc(`a${i}`)), ...extra];
  return { docs, size: docs.length, metadata: { fromCache } };
};

/** Subscribes with `size` and plays the given snapshots in order; returns every page passed on. */
function play(size: number, snapshots: ReturnType<typeof snapshot>[]): AlertHistoryPage[] {
  const pages: AlertHistoryPage[] = [];
  vi.mocked(onSnapshot).mockImplementation(((_q: unknown, _options: unknown, onData: (snap: unknown) => void) => {
    snapshots.forEach((snap) => onData(snap));
    return () => {};
  }) as never);
  subscribeAlertHistory(size, (p) => pages.push(p), () => {});
  return pages;
}

/** Subscribes with `size` and answers from the server with `count` documents. */
const history = (size: number, count: number, extra: ReturnType<typeof doc>[] = []): AlertHistoryPage =>
  play(size, [snapshot(count, false, extra)])[0];

describe("subscribeAlertHistory", () => {
  beforeEach(() => vi.clearAllMocks());

  it("asks for the newest alerts, one more than a page, ordered by createdAt only (no index needed)", () => {
    history(50, 0);
    expect(orderBy).toHaveBeenCalledWith("createdAt", "desc");
    expect(limit).toHaveBeenCalledWith(51);
    expect(vi.mocked(onSnapshot).mock.calls[0][1]).toEqual({ includeMetadataChanges: true });
  });

  it("skips a partial page from the cache until the server answers, so Load More never claims all loaded too early", () => {
    // Load More to 100: the cache holds only the 51 already seen; the server then sends all 71.
    const pages = play(100, [snapshot(51, true), snapshot(71, false)]);
    expect(pages).toHaveLength(1);
    expect(pages[0].alerts).toHaveLength(71);
    expect(pages[0].hasMore).toBe(false);
  });

  it("passes on a full page from the cache straight away: it already proves there are more", () => {
    const pages = play(50, [snapshot(51, true)]);
    expect(pages).toHaveLength(1);
    expect(pages[0].hasMore).toBe(true);
  });

  it("passes on cached pages once the server has answered (for example while offline)", () => {
    const pages = play(50, [snapshot(12, false), snapshot(12, true)]);
    expect(pages).toHaveLength(2);
  });

  it("reports more when the extra document arrives, and drops it from the page", () => {
    const page = history(50, 51);
    expect(page.alerts).toHaveLength(50);
    expect(page.hasMore).toBe(true);
    expect(page.size).toBe(50);
  });

  it("reports no more when the page is not full", () => {
    const page = history(50, 12);
    expect(page.alerts).toHaveLength(12);
    expect(page.hasMore).toBe(false);
  });

  it("skips a malformed document without losing the rest", () => {
    const bad = { id: "bad", data: () => ({ product: "", state: "Resolved" }) };
    const page = history(50, 3, [bad as never]);
    expect(page.alerts.map((a) => a.id)).toEqual(["a0", "a1", "a2"]);
  });
});

describe("acknowledgeAlert", () => {
  it("writes only the state and the server's timestamp", async () => {
    await acknowledgeAlert("a1");
    expect(updateDoc).toHaveBeenCalledWith({ collection: "alerts", id: "a1" }, { state: "Acknowledged", acknowledgedAt: "SERVER_TIME" });
  });
});
