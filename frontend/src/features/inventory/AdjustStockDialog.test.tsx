import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./stockActions", () => ({ adjustStock: vi.fn() }));

import AdjustStockDialog from "./AdjustStockDialog";
import { adjustStock } from "./stockActions";
import type { Product } from "./types";

const product: Product = {
  id: "spark_plug",
  name: "Spark Plug",
  posCount: 4,
  reorderLevel: 3,
  reorderQty: 1,
  unitCost: 950,
  unitPrice: 1250,
};

function open(shelfCount: number | null = 3, p: Product = product) {
  const onClose = vi.fn();
  const onSaved = vi.fn();
  render(<AdjustStockDialog product={p} shelfCount={shelfCount} onClose={onClose} onSaved={onSaved} />);
  return { onClose, onSaved };
}
const countBox = () => screen.getByRole("textbox", { name: /Counted Units/ });
const save = () => userEvent.click(screen.getByRole("button", { name: "Save Adjustment" }));

describe("AdjustStockDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("is a named dialog that starts from the camera's count and warns that the camera can be wrong", async () => {
    open(3);
    expect(screen.getByRole("dialog", { name: "Adjust Spark Plug" })).toBeInTheDocument();
    expect(countBox()).toHaveValue("3");
    await vi.waitFor(() => expect(countBox()).toHaveFocus());
    expect(screen.getByText(/camera counted 3.*can miss parts facing away/)).toBeInTheDocument();
  });

  it("starts empty when the camera agrees with the POS or has not scanned", () => {
    open(4);
    expect(countBox()).toHaveValue("");
    expect(screen.getByText(/Enter a count that differs/)).toBeInTheDocument();
  });

  it("shows the change and the write-off value, and offers only write-off reasons for fewer units", () => {
    open(2);
    expect(screen.getByRole("status")).toHaveTextContent(/POS record 4 → 2 \(.2\) · Write-off value LKR\s?1,900\.00/);
    const radios = screen.getAllByRole("radio").map((r) => r.closest("label")?.textContent);
    expect(radios).toEqual(["Damaged", "Lost or Stolen", "Miscount"]);
  });

  it("offers Found and Customer Return for more units, with no write-off value", async () => {
    open(null);
    await userEvent.type(countBox(), "6");
    expect(screen.getByRole("status")).toHaveTextContent(/^POS record 4 → 6 \(\+2\)$/);
    expect(screen.getByRole("radio", { name: "Customer Return" })).toBeInTheDocument();
    expect(screen.queryByRole("radio", { name: "Damaged" })).not.toBeInTheDocument();
  });

  it("drops a chosen reason when the count changes direction", async () => {
    open(3);
    await userEvent.click(screen.getByRole("radio", { name: "Miscount" }));
    await userEvent.click(screen.getByRole("radio", { name: "Damaged" }));
    await userEvent.clear(countBox());
    await userEvent.type(countBox(), "5");
    expect(screen.getAllByRole("radio").every((r) => !(r as HTMLInputElement).checked)).toBe(true);
  });

  it("asks for a reason without saving, and links the message to the group", async () => {
    open(3);
    await save();
    expect(adjustStock).not.toHaveBeenCalled();
    const group = screen.getByRole("radiogroup", { name: "Reason" });
    expect(group).toHaveAccessibleDescription("Choose why the count changed.");
  });

  it("explains a count equal to the POS record", async () => {
    open(null);
    await userEvent.type(countBox(), "4");
    await save();
    expect(countBox()).toHaveAccessibleDescription(/already the POS record/);
    expect(countBox()).toBeInvalid();
    expect(adjustStock).not.toHaveBeenCalled();
  });

  it("saves the adjustment, announces it and closes", async () => {
    vi.mocked(adjustStock).mockResolvedValue(3);
    const { onClose, onSaved } = open(3);
    await userEvent.click(screen.getByRole("radio", { name: "Lost or Stolen" }));
    await save();
    expect(adjustStock).toHaveBeenCalledWith("spark_plug", 3, "LostOrStolen");
    expect(onSaved).toHaveBeenCalledWith(expect.stringMatching(/^Adjusted Spark Plug: POS record 4 → 3 \(.1\), Lost or Stolen\.$/));
    expect(onClose).toHaveBeenCalled();
  });

  it("keeps the dialog open with a next step when saving fails", async () => {
    vi.mocked(adjustStock).mockRejectedValue({ code: "unavailable" });
    const { onClose } = open(3);
    await userEvent.click(screen.getByRole("radio", { name: "Damaged" }));
    await save();
    expect(await screen.findByRole("alert")).toHaveTextContent(/Could not reach the database/);
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save Adjustment" })).toBeEnabled();
  });

  it("closes with Cancel without saving", async () => {
    const { onClose } = open(3);
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(adjustStock).not.toHaveBeenCalled();
  });
});
