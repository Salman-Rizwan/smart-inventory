import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./alertRepository", () => ({ subscribeAlertHistory: vi.fn() }));

import { subscribeAlertHistory, type AlertHistoryPage } from "./alertRepository";
import type { Alert } from "./types";
import { HISTORY_PAGE_SIZE, useAlertHistory } from "./useAlertHistory";

const alerts = (n: number): Alert[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `a${i}`,
    product: "spark_plug",
    visualCount: 3,
    posCount: 4,
    state: "Resolved",
    createdAt: null,
    acknowledgedAt: null,
    resolvedAt: null,
  }));

type Listener = { size: number; onData: (p: AlertHistoryPage) => void; onError: (e: unknown) => void };
let listeners: Listener[] = [];
const unsubscribe = vi.fn();

describe("useAlertHistory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listeners = [];
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(subscribeAlertHistory).mockImplementation((size, onData, onError) => {
      listeners.push({ size, onData, onError });
      return unsubscribe;
    });
  });

  it("loads the first page of 50", () => {
    const { result } = renderHook(() => useAlertHistory());
    expect(result.current.loading).toBe(true);
    expect(listeners[0].size).toBe(HISTORY_PAGE_SIZE);
    act(() => listeners[0].onData({ alerts: alerts(50), hasMore: true, size: 50 }));
    expect(result.current.loading).toBe(false);
    expect(result.current.alerts).toHaveLength(50);
    expect(result.current.hasMore).toBe(true);
  });

  it("widens the same live query on Load More, keeping the shown rows until the larger page arrives", () => {
    const { result } = renderHook(() => useAlertHistory());
    act(() => listeners[0].onData({ alerts: alerts(50), hasMore: true, size: 50 }));

    act(() => result.current.loadMore());
    expect(unsubscribe).toHaveBeenCalledTimes(1); // the old listener is closed
    expect(listeners[1].size).toBe(100);
    expect(result.current.loadingMore).toBe(true);
    expect(result.current.alerts).toHaveLength(50);

    act(() => listeners[1].onData({ alerts: alerts(73), hasMore: false, size: 100 }));
    expect(result.current.loadingMore).toBe(false);
    expect(result.current.alerts).toHaveLength(73);
    expect(result.current.hasMore).toBe(false);
  });

  it("shows a safe message with a next step when the history cannot load", () => {
    const { result } = renderHook(() => useAlertHistory());
    act(() => listeners[0].onError({ code: "permission-denied", message: "secret" }));
    expect(result.current.error).toMatch(/Past alerts could not be loaded\. Check your connection/);
    expect(result.current.error).not.toContain("secret");
    expect(result.current.loading).toBe(false);
  });
});
