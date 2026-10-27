import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./AlertsContext", () => ({ useAlerts: vi.fn() }));

import { useAlerts } from "./AlertsContext";
import AlertBell from "./AlertBell";
import type { Alert } from "./types";

const alert = (id: string, product: string, state: Alert["state"], visualCount: number, posCount: number): Alert => ({
  id,
  product,
  state,
  visualCount,
  posCount,
  createdAt: new Date("2026-10-27T05:00:00Z"),
});

const provide = (alerts: Alert[]) =>
  vi.mocked(useAlerts).mockReturnValue({
    enabled: true,
    alerts,
    openCount: alerts.filter((a) => a.state === "Open").length,
    loading: false,
    error: "",
  });

const renderBell = () =>
  render(
    <MemoryRouter>
      <AlertBell />
      <h2 id="alerts-title" tabIndex={-1}>
        Active Alerts
      </h2>
    </MemoryRouter>,
  );

describe("AlertBell", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  it("says there are no open alerts and shows no badge", () => {
    provide([]);
    renderBell();
    expect(screen.getByRole("button", { name: "Notifications: no open alerts" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("counts open alerts in the badge and the accessible name, singular and plural", () => {
    provide([alert("a", "spark_plug", "Open", 3, 4)]);
    const { unmount } = renderBell();
    expect(screen.getByRole("button", { name: "Notifications: 1 open alert" })).toBeInTheDocument();
    unmount();
    provide([alert("a", "spark_plug", "Open", 3, 4), alert("b", "petrol_filter", "Open", 0, 1)]);
    renderBell();
    expect(screen.getByRole("button", { name: "Notifications: 2 open alerts" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("lists open alerts only, describing what the camera and POS say", async () => {
    provide([alert("a", "spark_plug", "Open", 3, 4), alert("b", "petrol_filter", "Acknowledged", 0, 1)]);
    renderBell();
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Spark Plug mismatch/ })).toHaveTextContent("Camera sees 3, POS says 4.");
    expect(screen.queryByText(/Petrol Filter mismatch/)).not.toBeInTheDocument();
  });

  it("shows an empty state when there is nothing new", async () => {
    provide([alert("b", "petrol_filter", "Acknowledged", 0, 1)]);
    renderBell();
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    expect(screen.getByText("No new alerts")).toBeInTheDocument();
  });

  it("selecting an alert closes the menu and moves focus to the alerts panel", async () => {
    provide([alert("a", "spark_plug", "Open", 3, 4)]);
    renderBell();
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    await userEvent.click(screen.getByRole("button", { name: /Spark Plug mismatch/ }));
    expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Active Alerts" })).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });

  it("skips smooth scrolling for people who prefer reduced motion", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    provide([alert("a", "spark_plug", "Open", 3, 4)]);
    renderBell();
    await userEvent.click(screen.getByRole("button", { name: /Notifications/ }));
    await userEvent.click(screen.getByRole("button", { name: "View Alerts" }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });
});
