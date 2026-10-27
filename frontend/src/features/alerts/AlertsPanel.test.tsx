import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./AlertsContext", () => ({ useAlerts: vi.fn() }));
vi.mock("./alertRepository", () => ({ acknowledgeAlert: vi.fn() }));

import { useAlerts } from "./AlertsContext";
import { acknowledgeAlert } from "./alertRepository";
import AlertsPanel from "./AlertsPanel";
import type { Alert } from "./types";

const alert = (id: string, product: string, state: Alert["state"], visualCount: number, posCount: number): Alert => ({
  id,
  product,
  state,
  visualCount,
  posCount,
  createdAt: new Date("2026-10-27T05:00:00Z"),
});

const provide = (alerts: Alert[], extra: Partial<ReturnType<typeof useAlerts>> = {}) =>
  vi.mocked(useAlerts).mockReturnValue({
    enabled: true,
    alerts,
    openCount: alerts.filter((a) => a.state === "Open").length,
    loading: false,
    error: "",
    ...extra,
  });

describe("AlertsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows loading", () => {
    provide([], { loading: true });
    render(<AlertsPanel />);
    expect(screen.getByText("Loading alerts…")).toBeInTheDocument();
  });

  it("shows a load error", () => {
    provide([], { error: "Alerts could not be loaded." });
    render(<AlertsPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("Alerts could not be loaded.");
  });

  it("shows a calm empty state with no alerts", () => {
    provide([]);
    render(<AlertsPanel />);
    expect(screen.getByText("No active alerts")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ Open/)).not.toBeInTheDocument();
  });

  it("lists an open alert with the camera and POS counts and an Acknowledge button", () => {
    provide([alert("a1", "spark_plug", "Open", 3, 4)]);
    render(<AlertsPanel />);
    const row = within(screen.getByRole("row", { name: /Spark Plug/ }));
    expect(row.getByText("Open")).toBeInTheDocument();
    expect(row.getByRole("cell", { name: "3" })).toBeInTheDocument();
    expect(row.getByRole("cell", { name: "4" })).toBeInTheDocument();
    expect(screen.getByText("1 Open")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Acknowledge Spark Plug alert" })).toBeInTheDocument();
  });

  it("announces the open count to screen readers", () => {
    provide([alert("a1", "spark_plug", "Open", 3, 4), alert("a2", "petrol_filter", "Open", 0, 1)]);
    render(<AlertsPanel />);
    expect(screen.getAllByRole("status").some((el) => el.textContent === "2 open alerts.")).toBe(true);
  });

  it("shows an acknowledged alert without an Acknowledge button", () => {
    provide([alert("a1", "spark_plug", "Acknowledged", 3, 4)]);
    render(<AlertsPanel />);
    expect(screen.getByText("Acknowledged")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Acknowledge/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ Open/)).not.toBeInTheDocument();
  });

  it("lists open alerts before acknowledged ones", () => {
    provide([alert("a1", "spark_plug", "Acknowledged", 3, 4), alert("a2", "petrol_filter", "Open", 0, 1)]);
    render(<AlertsPanel />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Petrol Filter");
    expect(rows[1]).toHaveTextContent("Spark Plug");
  });

  it("acknowledges an alert", async () => {
    provide([alert("a1", "spark_plug", "Open", 3, 4)]);
    vi.mocked(acknowledgeAlert).mockResolvedValue(undefined);
    render(<AlertsPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Acknowledge Spark Plug alert" }));

    expect(acknowledgeAlert).toHaveBeenCalledWith("a1");
  });

  it("shows a next step when acknowledging is refused, and keeps the button", async () => {
    provide([alert("a1", "spark_plug", "Open", 3, 4)]);
    vi.mocked(acknowledgeAlert).mockRejectedValue({ code: "permission-denied", message: "secret rule detail" });
    render(<AlertsPanel />);

    await userEvent.click(screen.getByRole("button", { name: "Acknowledge Spark Plug alert" }));

    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/Refresh the page/);
    expect(error).not.toHaveTextContent("secret");
    expect(screen.getByRole("button", { name: "Acknowledge Spark Plug alert" })).toBeEnabled();
  });
});
