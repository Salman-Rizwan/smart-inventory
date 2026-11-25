import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("./productRepository", () => ({ subscribeProducts: vi.fn(() => () => {}) }));

import { useProducts } from "./hooks";
import { ProductsProvider } from "./ProductsContext";
import { subscribeProducts } from "./productRepository";

function Probe() {
  const { loading } = useProducts();
  return <p>{loading ? "loading" : "idle"}</p>;
}

describe("ProductsProvider", () => {
  it("subscribes once for a role that sees stock", () => {
    render(
      <ProductsProvider enabled>
        <Probe />
        <Probe />
      </ProductsProvider>,
    );
    expect(subscribeProducts).toHaveBeenCalledTimes(1);
    expect(screen.getAllByText("loading")).toHaveLength(2);
  });

  it("never subscribes for a role that does not (the dealer)", () => {
    vi.mocked(subscribeProducts).mockClear();
    render(
      <ProductsProvider enabled={false}>
        <Probe />
      </ProductsProvider>,
    );
    expect(subscribeProducts).not.toHaveBeenCalled();
  });

  it("must be used inside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Probe />)).toThrow(/inside <ProductsProvider>/);
  });
});
