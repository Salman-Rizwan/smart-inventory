import { ThemeProvider } from "@mui/material/styles";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { theme } from "../shared/theme/theme";
import PrimaryNav, { type NavItem } from "./PrimaryNav";

const ITEMS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/orders", label: "Orders", badge: "orders" },
];

const renderNav = (path: string, attentionCount: number, items = ITEMS) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <PrimaryNav items={items} attentionCount={attentionCount} />
      </MemoryRouter>
    </ThemeProvider>,
  );

describe("PrimaryNav", () => {
  it("is a labelled navigation landmark of real links", () => {
    renderNav("/dashboard", 0);
    const nav = screen.getByRole("navigation", { name: "Primary" });
    const links = screen.getAllByRole("link");
    expect(nav).toContainElement(links[0]);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(["/dashboard", "/orders"]);
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

  it("only counts on items that carry the orders badge", () => {
    renderNav("/orders", 3, [{ to: "/orders", label: "Purchase Orders" }]);
    expect(screen.getByRole("link", { name: "Purchase Orders" })).toBeInTheDocument();
    expect(screen.queryByText("3")).toBeNull();
  });
});
