import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useNow } from "./useNow";

describe("useNow", () => {
  afterEach(() => vi.useRealTimers());

  it("refreshes on its interval and stops when unmounted", () => {
    vi.useFakeTimers({ now: new Date("2026-11-11T09:00:00Z") });
    const { result, unmount } = renderHook(() => useNow(15_000));
    expect(result.current.toISOString()).toBe("2026-11-11T09:00:00.000Z");
    act(() => vi.advanceTimersByTime(15_000));
    expect(result.current.toISOString()).toBe("2026-11-11T09:00:15.000Z");
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});
