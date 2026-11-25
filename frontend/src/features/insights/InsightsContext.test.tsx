import { render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./insightsRepository", () => ({
  subscribeMovementsSince: vi.fn(() => () => {}),
  subscribeOrdersSince: vi.fn(() => () => {}),
}));

import { InsightsProvider, useInsightsData } from "./InsightsContext";
import { subscribeMovementsSince, subscribeOrdersSince } from "./insightsRepository";

function Probe() {
  const { loading, error, movements, loadedFrom } = useInsightsData();
  return <p>{error || (loading ? "loading" : `${movements.length} entries from ${loadedFrom.toISOString()}`)}</p>;
}

describe("InsightsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 10, 12, 12, 0));
  });
  afterEach(() => vi.useRealTimers());

  it("subscribes once to each collection, from 180 days ago at local midnight", () => {
    render(
      <InsightsProvider enabled>
        <Probe />
        <Probe />
      </InsightsProvider>,
    );
    expect(subscribeMovementsSince).toHaveBeenCalledTimes(1);
    expect(subscribeOrdersSince).toHaveBeenCalledTimes(1);
    expect(vi.mocked(subscribeMovementsSince).mock.calls[0][0]).toEqual(new Date(2026, 4, 16, 0, 0));
    expect(screen.getAllByText("loading")).toHaveLength(2);
  });

  it("is loading until both answer, then shares the data", () => {
    vi.mocked(subscribeMovementsSince).mockImplementation((_since, onData) => {
      onData([]);
      return () => {};
    });
    const { rerender } = render(
      <InsightsProvider enabled>
        <Probe />
      </InsightsProvider>,
    );
    expect(screen.getByText("loading")).toBeInTheDocument();
    vi.mocked(subscribeOrdersSince).mockImplementation((_since, onData) => {
      onData([]);
      return () => {};
    });
    rerender(
      <InsightsProvider enabled key="again">
        <Probe />
      </InsightsProvider>,
    );
    expect(screen.getByText(/0 entries from/)).toBeInTheDocument();
  });

  it("reports a load error with a next step", () => {
    vi.mocked(subscribeOrdersSince).mockImplementation((_since, _onData, onError) => {
      onError(new Error("permission-denied"));
      return () => {};
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <InsightsProvider enabled>
        <Probe />
      </InsightsProvider>,
    );
    expect(screen.getByText(/Insights could not be loaded. Check your connection/)).toBeInTheDocument();
  });

  it("never subscribes for a role that does not see stock (the dealer)", () => {
    render(
      <InsightsProvider enabled={false}>
        <Probe />
      </InsightsProvider>,
    );
    expect(subscribeMovementsSince).not.toHaveBeenCalled();
    expect(subscribeOrdersSince).not.toHaveBeenCalled();
  });

  it("must be used inside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/inside <InsightsProvider>/);
  });
});
