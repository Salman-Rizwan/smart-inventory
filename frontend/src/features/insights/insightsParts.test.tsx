import { render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { actionLink } from "./actionLink";
import ActionList from "./ActionList";
import { emptySales, type Action, type PartInsight, type SalesBucket } from "./analytics";
import PartRanking from "./PartRanking";
import SalesDataTable from "./SalesDataTable";

const part = (id: string, name: string, action: Action, sales = emptySales()): PartInsight =>
  ({ part: id, name, action, sales, shelf: 4, reorderLevel: 2 }) as PartInsight;

describe("actionLink", () => {
  it("leads to the orders when one is due or open, and to Part Settings when the level should change", () => {
    expect(actionLink({ kind: "due" }, "spark_plug")).toEqual({ to: "/orders", label: "View Orders" });
    expect(actionLink({ kind: "waiting", state: "Pending" }, "spark_plug")).toEqual({ to: "/orders", label: "View Orders" });
    expect(actionLink({ kind: "adjust", level: 5, direction: "raise" }, "spark_plug")).toEqual({
      to: "/products?part=spark_plug",
      label: "Edit in Part Settings",
    });
  });

  it("has no link where there is nothing to act on", () => {
    for (const kind of ["scan", "no-sales", "ok"] as const) expect(actionLink({ kind }, "spark_plug")).toBeNull();
    expect(actionLink({ kind: "not-enough", historyDays: 1, deliveries: 0 }, "spark_plug")).toBeNull();
  });

  it("encodes a part id that needs it", () => {
    expect(actionLink({ kind: "adjust", level: 1, direction: "lower" }, "a b&c")?.to).toBe("/products?part=a%20b%26c");
  });
});

describe("ActionList", () => {
  it("lists every part with its badge, its words and its link, in the order given", () => {
    render(
      <MemoryRouter>
        <ActionList
          basisDays={30}
          parts={[part("a", "Alpha", { kind: "due" }), part("b", "Bravo", { kind: "ok" }), part("c", "Charlie", { kind: "waiting", state: "Dispatched" })]}
        />
      </MemoryRouter>,
    );
    const items = within(screen.getByRole("list", { name: "What to do for each part" })).getAllByRole("listitem");
    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Alpha");
    expect(items[0]).toHaveTextContent("Order Due");
    expect(items[0]).toHaveTextContent("At the reorder level: an order is raised after two low scans");
    expect(items[1]).toHaveTextContent("Bravo");
    expect(items[1]).toHaveTextContent("OK: stock and reorder level fit the sales");
    expect(items[2]).toHaveTextContent("Charlie");
    expect(items[2]).toHaveTextContent("Order Open");
    expect(items[2]).toHaveTextContent("Order on its way: mark it received when it arrives");
    expect(within(items[0]).getByRole("link", { name: "View Orders for Alpha" })).toHaveAttribute("href", "/orders");
    expect(within(items[1]).queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText(/the last 30 days of sales/)).toBeInTheDocument();
  });
});

describe("PartRanking", () => {
  const sales = (units: number, value: number, profit: number, profitBase = value) => ({ ...emptySales(), units, value, profit, profitBase });

  it("shows a dash instead of a profit when the units sold had no cost", () => {
    render(<PartRanking parts={[part("a", "Alpha", { kind: "ok" }, { ...sales(4, 2000, 0, 0), uncosted: 4 })]} />);
    const cells = within(screen.getAllByRole("row")[1]).getAllByRole("cell").map((c) => c.textContent);
    expect(cells[0]).toBe("4");
    expect(cells[2]).toBe("—");
    expect(cells[3]).toBe("—"); // no margin
    expect(cells[4]).toBe("—"); // no share
  });

  it("shows zero units and no margin for a part that sold nothing", () => {
    render(<PartRanking parts={[part("a", "Alpha", { kind: "ok" })]} />);
    expect(within(screen.getAllByRole("row")[1]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["0", expect.stringMatching(/0/), expect.stringMatching(/0/), "—", "—"]);
  });

  it("shows a loss as a negative profit", () => {
    render(<PartRanking parts={[part("a", "Alpha", { kind: "ok" }, sales(2, 600, -100))]} />);
    expect(within(screen.getAllByRole("row")[1]).getAllByRole("cell")[2].textContent).toMatch(/-.*100/);
  });
});

describe("SalesDataTable", () => {
  const day = (offset: number) => new Date(2026, 10, 1 + offset);
  const bucket = (offset: number, days: number, units: number): SalesBucket => ({
    key: `k${offset}`,
    start: day(offset),
    end: day(offset + days - 1),
    days,
    byPart: { a: { ...emptySales(), units } },
    total: { ...emptySales(), units, value: units * 500, profit: units * 150 },
  });

  it("labels the first column Day for daily bars and Week for weekly ones, with the partial first week named by its dates", () => {
    const parts = [{ part: "a", name: "Alpha" }];
    const { unmount } = render(<SalesDataTable buckets={[bucket(0, 1, 2)]} parts={parts} />);
    expect(screen.getByRole("columnheader", { name: "Day" })).toBeInTheDocument();
    unmount();
    render(<SalesDataTable buckets={[bucket(0, 6, 3), bucket(6, 7, 4)]} parts={parts} />);
    expect(screen.getByRole("columnheader", { name: "Week" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(" to ");
    expect(within(rows[1]).getAllByRole("cell").map((c) => c.textContent)).toEqual(["4", "4", expect.stringMatching(/2,000/), expect.stringMatching(/600/)]);
  });
});
