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

describe("AlertsProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.title = "Smart Inventory";
  });

  it("puts the open-alert count in the browser tab title", () => {
    vi.mocked(subscribeActiveAlerts).mockImplementation((onData) => {
      onData([alert("a1", "Open"), alert("a2", "Open"), alert("a3", "Acknowledged")]);
      return () => {};
    });
    render(
      <AlertsProvider enabled>
        <Probe />
      </AlertsProvider>,
    );
    expect(screen.getByText("open=2 total=3 loading=false error=")).toBeInTheDocument();
    expect(document.title).toBe("(2) Smart Inventory");
  });

  it("restores the plain title when there are no open alerts", () => {
    vi.mocked(subscribeActiveAlerts).mockImplementation((onData) => {
      onData([alert("a1", "Acknowledged")]);
      return () => {};
    });
    render(
      <AlertsProvider enabled>
        <Probe />
      </AlertsProvider>,
    );
    expect(document.title).toBe("Smart Inventory");
  });

  it("restores the title and unsubscribes on unmount", () => {
    const unsubscribe = vi.fn();
    vi.mocked(subscribeActiveAlerts).mockImplementation((onData) => {
      onData([alert("a1", "Open")]);
      return unsubscribe;
    });
    const { unmount } = render(
      <AlertsProvider enabled>
        <Probe />
      </AlertsProvider>,
    );
    expect(document.title).toBe("(1) Smart Inventory");
    unmount();
    expect(document.title).toBe("Smart Inventory");
    expect(unsubscribe).toHaveBeenCalled();
  });

  it("surfaces a listener failure as an error message", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(subscribeActiveAlerts).mockImplementation((_onData, onError) => {
      onError(new Error("permission-denied"));
      return () => {};
    });
    render(
      <AlertsProvider enabled>
        <Probe />
      </AlertsProvider>,
    );
    expect(screen.getByText(/error=Alerts could not be loaded/)).toBeInTheDocument();
  });

  it("never subscribes for a role that does not see alerts", () => {
    render(
      <AlertsProvider enabled={false}>
        <Probe />
      </AlertsProvider>,
    );
    expect(subscribeActiveAlerts).not.toHaveBeenCalled();
    expect(screen.getByText("open=0 total=0 loading=false error=")).toBeInTheDocument();
    expect(document.title).toBe("Smart Inventory");
  });
});
