import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { theme } from "../shared/theme/theme";
import PrimaryNav, { type NavItem } from "./PrimaryNav";

const ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/alerts", label: "Alerts", badge: "alerts" },
  { to: "/orders", label: "Orders", badge: "orders" },
];

const renderNav = (path: string, attentionCount: number, items = ITEMS, openAlerts = 0) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <PrimaryNav items={items} counts={{ orders: attentionCount, alerts: openAlerts }} />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe("PrimaryNav", () => {
  it("is a labelled navigation landmark of real links", () => {
    renderNav("/dashboard", 0);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const links = screen.getAllByRole("link");
    expect(nav).toContainElement(links[0]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/dashboard", "/alerts", "/orders"]);
  });

  it("marks the current page", () => {
    renderNav("/orders", 0);
    expect(screen.getByRole("link", { name: "Orders" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("shows how many orders need action, in words for screen readers", () => {
    renderNav("/dashboard", 2);
    const orders = screen.getByRole("link", { name: "Orders, 2 need your action" });
    expect(orders).toBeInTheDocument();
    expect(screen.getByText("2")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows no count when nothing needs action", () => {
    renderNav("/dashboard", 0);
    expect(screen.getByRole("link", { name: "Orders" })).toBeInTheDocument();
    expect(screen.queryByText(/need your action/)).toBeNull();
  });

  it("shows the open alert count on the Alerts tab, separately from orders", () => {
    renderNav("/dashboard", 1, ITEMS, 3);
    expect(screen.getByRole("link", { name: "Alerts, 3 open" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Orders, 1 need your action" })).toBeInTheDocument();
  });

  it("shows no alert count when none are open", () => {
    renderNav("/dashboard", 0, ITEMS, 0);
    expect(screen.getByRole("link", { name: "Alerts" })).toBeInTheDocument();
  });

  it("only counts on items that carry a badge", () => {
    renderNav("/orders", 3, [{ to: "/orders", label: "Purchase Orders" }]);
    expect(screen.getByRole("link", { name: "Purchase Orders" })).toBeInTheDocument();
    expect(screen.queryByText("3")).toBeNull();
  });

  it("scrolls the current tab into view, so a tab beyond the edge of a narrow phone is never hidden", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    renderNav("/orders", 0);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest", behavior: "smooth" });
    expect(scrollIntoView.mock.contexts[0]).toBe(screen.getByRole("link", { name: "Orders" }));
  });

  it("does not animate that scroll when reduced motion is asked for", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    renderNav("/alerts", 0);
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest", inline: "nearest", behavior: "auto" });
  });

  it("does nothing off the nav", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    renderNav("/somewhere-else", 0);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});
