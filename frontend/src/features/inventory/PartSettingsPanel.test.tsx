import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hooks", () => ({ useProducts: vi.fn() }));
vi.mock("./productRepository", () => ({ savePartSettings: vi.fn() }));

import { useProducts } from "./hooks";
import PartSettingsPanel from "./PartSettingsPanel";
import { savePartSettings } from "./productRepository";
import type { Product } from "./types";

const spark: Product = { id: "spark_plug", name: "Spark Plug", posCount: 4, reorderLevel: 3, reorderQty: 1, unitCost: 950, unitPrice: 1250 };
const filter: Product = { id: "petrol_filter", name: "Petrol Filter", posCount: 1, reorderLevel: 0, reorderQty: 0, unitCost: null, unitPrice: null };
const ready = (data: Product[]) => vi.mocked(useProducts).mockReturnValue({ data, error: "", loading: false });
const field = (name: RegExp) => screen.getByRole("textbox", { name });

describe("PartSettingsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("lists cost, price, margin and reorder settings in the shop's currency", () => {
    ready([spark, filter]);
    render(<PartSettingsPanel />);
    const row = within(screen.getByRole("row", { name: /Spark Plug/ }));
    expect(row.getByText(/LKR\s?950\.00/)).toBeInTheDocument();
    expect(row.getByText(/LKR\s?1,250\.00/)).toBeInTheDocument();
    expect(row.getByText("24%")).toBeInTheDocument();
  });

  it("says Not Set for unknown amounts and Off when automatic orders are off", () => {
    ready([filter]);
    render(<PartSettingsPanel />);
    const row = within(screen.getByRole("row", { name: /Petrol Filter/ }));
    expect(row.getAllByText("Not set")).toHaveLength(2);
    expect(row.getByText("—")).toBeInTheDocument();
    expect(row.getByText("Off")).toBeInTheDocument();
  });

  it("shows loading and load errors", () => {
    vi.mocked(useProducts).mockReturnValue({ data: undefined, error: "", loading: true });
    const { unmount } = render(<PartSettingsPanel />);
    expect(screen.getByText("Loading part settings…")).toBeInTheDocument();
    unmount();
    vi.mocked(useProducts).mockReturnValue({ data: undefined, error: "Stock records could not be loaded.", loading: false });
    render(<PartSettingsPanel />);
    expect(screen.getByRole("alert")).toHaveTextContent("Stock records could not be loaded.");
  });

  it("edits the settings in a dialog prefilled with the current values", async () => {
    ready([spark]);
    vi.mocked(savePartSettings).mockResolvedValue();
    render(<PartSettingsPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Edit settings for Spark Plug" }));
    expect(screen.getByRole("dialog", { name: "Spark Plug Settings" })).toBeInTheDocument();
    expect(field(/Unit Cost \(LKR\)/)).toHaveValue("950");
    await vi.waitFor(() => expect(field(/Unit Cost/)).toHaveFocus());

    await userEvent.clear(field(/Selling Price/));
    await userEvent.type(field(/Selling Price/), "1,300");
    await userEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(savePartSettings).toHaveBeenCalledWith("spark_plug", { unitCost: 950, unitPrice: 1300, reorderLevel: 3, reorderQty: 1 });
    expect(await screen.findByText("Saved the settings for Spark Plug.")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("explains invalid fields, focuses the first one and saves nothing", async () => {
    ready([spark]);
    render(<PartSettingsPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Edit settings for Spark Plug" }));
    await userEvent.clear(field(/Reorder At/));
    await userEvent.type(field(/Unit Cost/), "x");
    await userEvent.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(savePartSettings).not.toHaveBeenCalled();
    expect(field(/Unit Cost/)).toHaveAccessibleDescription(/amount like 1250/);
    expect(field(/Reorder At/)).toHaveAccessibleDescription(/whole number/);
    await vi.waitFor(() => expect(field(/Unit Cost/)).toHaveFocus());
  });

  it("warns, without blocking, when the price is below cost", async () => {
    ready([spark]);
    render(<PartSettingsPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Edit settings for Spark Plug" }));
    await userEvent.clear(field(/Selling Price/));
    await userEvent.type(field(/Selling Price/), "900");
    expect(screen.getByRole("status")).toHaveTextContent(/below the cost/);
    expect(screen.getByRole("button", { name: "Save Settings" })).toBeEnabled();
  });

  it("keeps the dialog open with a next step when saving fails", async () => {
    ready([spark]);
    vi.mocked(savePartSettings).mockRejectedValue({ code: "permission-denied" });
    render(<PartSettingsPanel />);
    await userEvent.click(screen.getByRole("button", { name: "Edit settings for Spark Plug" }));
    await userEvent.click(screen.getByRole("button", { name: "Save Settings" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/Sign in as a shopkeeper/);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("focuses the Edit button of the part a link asks for, once per visit", async () => {
    ready([spark, filter]);
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    Element.prototype.scrollIntoView = vi.fn();
    const { rerender } = render(<PartSettingsPanel focusPart={{ id: "petrol_filter", visit: "a" }} />);
    const edit = screen.getByRole("button", { name: "Edit settings for Petrol Filter" });
    expect(edit).toHaveFocus();
    await userEvent.click(screen.getByRole("button", { name: "Edit settings for Spark Plug" }));
    await userEvent.keyboard("{Escape}");
    rerender(<PartSettingsPanel focusPart={{ id: "petrol_filter", visit: "a" }} />);
    expect(edit).not.toHaveFocus(); // the same visit does not steal focus again
    rerender(<PartSettingsPanel focusPart={{ id: "petrol_filter", visit: "b" }} />);
    expect(edit).toHaveFocus(); // a new visit does
  });

  it("highlights nothing and focuses nothing without a link", () => {
    ready([spark]);
    render(<PartSettingsPanel />);
    expect(document.body).toHaveFocus();
  });
});
