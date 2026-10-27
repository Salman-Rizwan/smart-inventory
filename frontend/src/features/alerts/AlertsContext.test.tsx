import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./alertRepository", () => ({ subscribeActiveAlerts: vi.fn() }));

import { AlertsProvider, useAlerts } from "./AlertsContext";
import { subscribeActiveAlerts } from "./alertRepository";
import type { Alert } from "./types";

const alert = (id: string, state: Alert["state"]): Alert => ({
  id,
  product: "spark_plug",
  state,
  visualCount: 3,
  posCount: 4,
  createdAt: null,
});

function Probe() {
  const { openCount, alerts, loading, error } = useAlerts();
  return <p>{`open=${openCount} total=${alerts.length} loading=${loading} error=${error}`}</p>;
}

const mount = (enabled = true) =>
  render(
    <AlertsProvider enabled={enabled}>
      <Probe />
    </AlertsProvider>,
  );

describe("AlertsProvider", () => {
  beforeEach(() => vi.clearAllMocks());

  it("counts only open alerts", () => {
    vi.mocked(subscribeActiveAlerts).mockImplementation((onData) => {
      onData([alert("a1", "Open"), alert("a2", "Open"), alert("a3", "Acknowledged")]);
      return () => {};
    });
    mount();
    expect(screen.getByText("open=2 total=3 loading=false error=")).toBeInTheDocument();
  });

  it("counts none when every alert is acknowledged", () => {
    vi.mocked(subscribeActiveAlerts).mockImplementation((onData) => {
      onData([alert("a1", "Acknowledged")]);
      return () => {};
    });
    mount();
    expect(screen.getByText("open=0 total=1 loading=false error=")).toBeInTheDocument();
  });

  it("unsubscribes on unmount", () => {
    const unsubscribe = vi.fn();
    vi.mocked(subscribeActiveAlerts).mockImplementation((onData) => {
      onData([alert("a1", "Open")]);
      return unsubscribe;
    });
    mount().unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("surfaces a listener failure as an error message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(subscribeActiveAlerts).mockImplementation((_onData, onError) => {
      onError(new Error("permission-denied"));
      return () => {};
    });
    mount();
    expect(screen.getByText(/error=Alerts could not be loaded/)).toBeInTheDocument();
  });

  it("never subscribes for a role that does not see alerts", () => {
    mount(false);
    expect(subscribeActiveAlerts).not.toHaveBeenCalled();
    expect(screen.getByText("open=0 total=0 loading=false error=")).toBeInTheDocument();
  });
});
