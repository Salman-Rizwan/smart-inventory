import { render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hooks", () => ({ useProducts: vi.fn() }));
vi.mock("./productRepository", () => ({ savePartSettings: vi.fn() }));

import { useProducts } from "./hooks";
import ProductsPage from "./ProductsPage";
import type { Product } from "./types";

const spark: Product = { id: "spark_plug", name: "Spark Plug", posCount: 4, reorderLevel: 3, reorderQty: 1, unitCost: 350, unitPrice: 500 };
const filter: Product = { id: "petrol_filter", name: "Petrol Filter", posCount: 1, reorderLevel: 0, reorderQty: 10, unitCost: 900, unitPrice: 1200 };
const provide = (data: Product[] | undefined, extra: { loading?: boolean; error?: string } = {}) =>
  vi.mocked(useProducts).mockReturnValue({ data, loading: false, error: "", ...extra });

const renderPage = (path = "/products") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/products" element={<ProductsPage />} />
      </Routes>
    </MemoryRouter>,
  );

describe("ProductsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("titles the page Products and lists every part's settings", () => {
    provide([spark, filter]);
    renderPage();
    expect(screen.getByRole("heading", { level: 1, name: "Products" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Part Settings" })).toBeInTheDocument();
    const rows = within(screen.getByRole("table", { name: /Cost, selling price and reorder settings/ })).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(screen.getByText(/Stock counts and sales are on the Dashboard and Insights/)).toBeInTheDocument();
  });

  it("shows loading, a load error with its next step, and an empty list", () => {
    provide(undefined, { loading: true });
    const { unmount } = renderPage();
    expect(screen.getByText("Loading part settings…")).toBeInTheDocument();
    unmount();
    provide(undefined, { error: "Stock records could not be loaded. Check your connection and sign in again if this continues." });
    const second = renderPage();
    expect(screen.getByRole("alert")).toHaveTextContent("Check your connection");
    second.unmount();
    provide([]);
    renderPage();
    expect(screen.getByText("No products yet")).toBeInTheDocument();
  });

  it("highlights the part a link asks for and puts focus on its Edit button", () => {
    provide([spark, filter]);
    renderPage("/products?part=petrol_filter");
    const edit = screen.getByRole("button", { name: "Edit settings for Petrol Filter" });
    expect(edit).toHaveFocus();
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Edit settings for Spark Plug" })).not.toHaveFocus();
  });

  it("does not move focus when no part is asked for", () => {
    provide([spark, filter]);
    renderPage();
    expect(document.body).toHaveFocus();
  });

  it("says so, and shows every part, when the link names a part that does not exist", () => {
    provide([spark, filter]);
    renderPage("/products?part=brake_pad");
    expect(screen.getByText("That part is not in the stock records. Showing all parts.")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Edit settings for/ })).toHaveLength(2);
    expect(document.body).toHaveFocus();
  });

  it("waits for the list to load before focusing, and does not claim the part is missing meanwhile", () => {
    provide(undefined, { loading: true });
    const { rerender } = renderPage("/products?part=spark_plug");
    expect(screen.queryByText(/not in the stock records/)).not.toBeInTheDocument();
    provide([spark, filter]);
    rerender(
      <MemoryRouter initialEntries={["/products?part=spark_plug"]}>
        <Routes>
          <Route path="/products" element={<ProductsPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByRole("button", { name: "Edit settings for Spark Plug" })).toHaveFocus();
  });
});
