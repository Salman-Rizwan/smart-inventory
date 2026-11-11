import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./AlertsContext", () => ({ useAlerts: vi.fn() }));
vi.mock("./alertRepository", () => ({ acknowledgeAlert: vi.fn() }));

import { acknowledgeAlert } from "./alertRepository";
import { useAlerts } from "./AlertsContext";
import AlertsSummary from "./AlertsSummary";
import type { Alert } from "./types";

const alert = (id: string, product: string, state: Alert["state"], hour = 5): Alert => ({
  id,
  product,
  state,
  visualCount: 5,
  posCount: 4,
  createdAt: new Date(`2026-10-27T0${hour}:00:00Z`),
  acknowledgedAt: null,
  resolvedAt: null,
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

const renderSummary = (mismatches?: number) =>
  render(
    <MemoryRouter>
      <AlertsSummary mismatches={mismatches} />
    </MemoryRouter>,
  );

const items = () => within(screen.getByRole("list", { name: /Active alerts/ })).getAllByRole("listitem");

describe("AlertsSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("shows loading", () => {
    provide([], { loading: true });
    renderSummary();
    expect(screen.getByText("Loading alerts…")).toBeInTheDocument();
  });

  it("shows a load error", () => {
    provide([], { error: "Alerts could not be loaded." });
    renderSummary();
    expect(screen.getByRole("alert")).toHaveTextContent("Alerts could not be loaded.");
  });

  it("is one calm line when nothing is active, and still links to the history", () => {
    provide([]);
    renderSummary();
    expect(screen.getByText("No active alerts. Everything on the shelf matches the POS records.")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText(/\d+ Open/)).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "View All Alerts" })).toHaveAttribute("href", "/alerts");
  });

  it.each([
    [1, "No active alerts yet. 1 part differs from the POS record"],
    [2, "No active alerts yet. 2 parts differ from the POS record"],
  ])("does not claim everything matches while %i mismatch waits out the alert delay", (mismatches, text) => {
    provide([]);
    renderSummary(mismatches);
    expect(screen.getByText(new RegExp(`^${text} \\(see Stock Check below\\); a mismatch that lasts is raised here`))).toBeInTheDocument();
    expect(screen.queryByText(/Everything on the shelf matches/)).not.toBeInTheDocument();
  });

  it("shows an open alert on one line with its counts and an Acknowledge button", () => {
    provide([alert("a1", "spark_plug", "Open")]);
    renderSummary();
    const line = within(items()[0]);
    expect(line.getByText("Spark Plug")).toBeInTheDocument();
    expect(line.getByText("On shelf 5, POS 4")).toBeInTheDocument();
    expect(line.getByText("Open")).toBeInTheDocument();
    expect(line.getByRole("button", { name: "Acknowledge Spark Plug alert" })).toBeInTheDocument();
    expect(screen.getByText("1 Open")).toBeInTheDocument();
  });

  it("shows an acknowledged alert without a button", () => {
    provide([alert("a1", "spark_plug", "Acknowledged")]);
    renderSummary();
    expect(within(items()[0]).getByText("Acknowledged")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("lists at most five, open first, and says how many more are on the Alerts page", () => {
    provide([
      alert("ack", "petrol_filter", "Acknowledged", 9),
      ...[1, 2, 3, 4, 5, 6].map((h) => alert(`o${h}`, "spark_plug", "Open", h)),
    ]);
    renderSummary();
    expect(items()).toHaveLength(5);
    expect(screen.queryByText("Petrol Filter")).not.toBeInTheDocument();
    expect(screen.getByText("Showing 5 of 7 active alerts.")).toBeInTheDocument();
  });

  it("announces the open count to screen readers", () => {
    provide([alert("a1", "spark_plug", "Open"), alert("a2", "petrol_filter", "Open")]);
    renderSummary();
    expect(screen.getAllByRole("status").some((el) => el.textContent === "2 open alerts.")).toBe(true);
  });

  it("acknowledges in one click and confirms it", async () => {
    provide([alert("a1", "spark_plug", "Open")]);
    vi.mocked(acknowledgeAlert).mockResolvedValue(undefined);
    renderSummary();
    await userEvent.click(screen.getByRole("button", { name: "Acknowledge Spark Plug alert" }));
    expect(acknowledgeAlert).toHaveBeenCalledWith("a1");
    expect(await screen.findByText(/Spark Plug alert acknowledged/)).toBeInTheDocument();
  });

  it("shows a next step when refused, linked to the button, which stays usable", async () => {
    provide([alert("a1", "spark_plug", "Open")]);
    vi.mocked(acknowledgeAlert).mockRejectedValue({ code: "permission-denied", message: "secret rule detail" });
    renderSummary();
    const button = screen.getByRole("button", { name: "Acknowledge Spark Plug alert" });
    await userEvent.click(button);
    const error = await screen.findByRole("alert");
    expect(error).toHaveTextContent(/Refresh the page/);
    expect(error).not.toHaveTextContent("secret");
    expect(button).toBeEnabled();
    expect(document.getElementById(button.getAttribute("aria-describedby") ?? "")).toContainElement(error);
  });
});
