import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./AlertsContext", () => ({ useAlerts: vi.fn() }));

import { useAlerts } from "./AlertsContext";
import AlertBell from "./AlertBell";

const provide = (openCount: number) =>
  vi.mocked(useAlerts).mockReturnValue({ enabled: true, alerts: [], openCount, loading: false, error: "" });

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

  it("shows no badge when there are no open alerts", () => {
    provide(0);
    renderBell();
    expect(screen.getByRole("button", { name: "No open alerts" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("shows the count and describes it in the accessible name", () => {
    provide(2);
    renderBell();
    expect(screen.getByRole("button", { name: "2 open alerts. Go to alerts" })).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("uses the singular for one alert and caps the badge at 9+", () => {
    provide(1);
    const { unmount } = renderBell();
    expect(screen.getByRole("button", { name: "1 open alert. Go to alerts" })).toBeInTheDocument();
    unmount();
    provide(12);
    renderBell();
    expect(screen.getByText("9+")).toBeInTheDocument();
  });

  it("scrolls to the alerts heading and moves focus there", async () => {
    provide(2);
    renderBell();
    await userEvent.click(screen.getByRole("button", { name: /2 open alerts/ }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
    expect(screen.getByRole("heading", { name: "Active Alerts" })).toHaveFocus();
  });

  it("skips smooth scrolling for people who prefer reduced motion", async () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    provide(1);
    renderBell();
    await userEvent.click(screen.getByRole("button", { name: /1 open alert/ }));
    expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "start" });
  });
});
