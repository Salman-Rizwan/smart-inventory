import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./hooks", () => ({ useProducts: vi.fn() }));
vi.mock("./stockActions", () => ({ recordSale: vi.fn(), receiveStock: vi.fn() }));

import { useProducts } from "./hooks";
import { StockError } from "./stock";
import { receiveStock, recordSale } from "./stockActions";
import StockCheckPanel from "./StockCheckPanel";
import type { Product } from "./types";

const product = (id: string, name: string, posCount: number): Product => ({
  id,
  name,
  posCount,
  reorderLevel: 2,
  reorderQty: 10,
});
const PRODUCTS = [product("spark_plug", "Spark Plug", 3), product("petrol_filter", "Petrol Filter", 1)];

const ready = (data: Product[]) => vi.mocked(useProducts).mockReturnValue({ data, error: "", loading: false });
const rowFor = (name: string) => screen.getByRole("row", { name: new RegExp(name) });

describe("StockCheckPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("states", () => {
    it("shows loading", () => {
      vi.mocked(useProducts).mockReturnValue({ data: undefined, error: "", loading: true });
      render(<StockCheckPanel counts={null} />);
      expect(screen.getByText("Loading stock records…")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("shows a load error", () => {
      vi.mocked(useProducts).mockReturnValue({ data: undefined, error: "Stock records could not be loaded.", loading: false });
      render(<StockCheckPanel counts={null} />);
      expect(screen.getByRole("alert")).toHaveTextContent("Stock records could not be loaded.");
    });

    it("shows an empty state instead of an empty table", () => {
      ready([]);
      render(<StockCheckPanel counts={null} />);
      expect(screen.getByText("No products yet")).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("reconciliation", () => {
    it("flags a mismatch and shows the difference (POS 3, shelf 4)", () => {
      ready(PRODUCTS);
      render(<StockCheckPanel counts={{ spark_plug: 4, petrol_filter: 1 }} />);
      const spark = within(rowFor("Spark Plug"));
      expect(spark.getByText("Mismatch")).toBeInTheDocument();
      expect(spark.getByText("+1")).toBeInTheDocument();
      expect(within(rowFor("Petrol Filter")).getByText("Matched")).toBeInTheDocument();
      expect(screen.getByText("1 Mismatch")).toBeInTheDocument();
    });

    it("says all matched when the shelf agrees with the POS", () => {
      ready(PRODUCTS);
      render(<StockCheckPanel counts={{ spark_plug: 3, petrol_filter: 1 }} />);
      expect(screen.getByText("All Matched")).toBeInTheDocument();
    });

    it("pluralises the mismatch count", () => {
      ready(PRODUCTS);
      render(<StockCheckPanel counts={{ spark_plug: 0, petrol_filter: 5 }} />);
      expect(screen.getByText("2 Mismatches")).toBeInTheDocument();
    });

    it("shows Not Scanned, with no summary, before the first scan", () => {
      ready(PRODUCTS);
      render(<StockCheckPanel counts={null} />);
      expect(screen.getAllByText("Not Scanned")).toHaveLength(2);
      expect(screen.queryByText("All Matched")).not.toBeInTheDocument();
    });
  });

  describe("Record Sale", () => {
    it("records a sale and announces the new POS count", async () => {
      ready(PRODUCTS);
      vi.mocked(recordSale).mockResolvedValue(2);
      render(<StockCheckPanel counts={{ spark_plug: 3, petrol_filter: 1 }} />);

      await userEvent.click(screen.getByRole("button", { name: "Record sale of Spark Plug" }));

      expect(recordSale).toHaveBeenCalledWith("spark_plug");
      expect(await screen.findByText("Recorded a sale of Spark Plug. POS record is now 2.")).toBeInTheDocument();
    });

    it("is disabled when the POS record is already 0", () => {
      ready([product("spark_plug", "Spark Plug", 0)]);
      render(<StockCheckPanel counts={null} />);
      expect(screen.getByRole("button", { name: "Record sale of Spark Plug" })).toBeDisabled();
    });

    it("shows a next step when the sale is refused", async () => {
      ready(PRODUCTS);
      vi.mocked(recordSale).mockRejectedValue(new StockError("insufficient"));
      render(<StockCheckPanel counts={null} />);

      await userEvent.click(screen.getByRole("button", { name: "Record sale of Spark Plug" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/already 0.*Receive stock first/);
      expect(screen.getByRole("button", { name: "Record sale of Spark Plug" })).toBeEnabled();
    });

    it("explains a permission failure without leaking details", async () => {
      ready(PRODUCTS);
      vi.mocked(recordSale).mockRejectedValue({ code: "permission-denied", message: "secret rule detail" });
      render(<StockCheckPanel counts={null} />);

      await userEvent.click(screen.getByRole("button", { name: "Record sale of Spark Plug" }));

      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent(/permission/i);
      expect(alert).not.toHaveTextContent("secret");
    });
  });

  describe("Receive Stock", () => {
    const qtyInput = () => screen.getByLabelText("Quantity to receive for Spark Plug");

    it("rejects a non-numeric quantity without calling the database", async () => {
      ready(PRODUCTS);
      render(<StockCheckPanel counts={null} />);

      await userEvent.type(qtyInput(), "abc");
      await userEvent.click(screen.getByRole("button", { name: "Receive stock for Spark Plug" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/whole number/i);
      expect(qtyInput()).toBeInvalid();
      expect(receiveStock).not.toHaveBeenCalled();
    });

    it("rejects an empty quantity", async () => {
      ready(PRODUCTS);
      render(<StockCheckPanel counts={null} />);

      await userEvent.click(screen.getByRole("button", { name: "Receive stock for Spark Plug" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/how many/i);
      expect(receiveStock).not.toHaveBeenCalled();
    });

    it("receives a valid quantity, clears the field and announces it", async () => {
      ready(PRODUCTS);
      vi.mocked(receiveStock).mockResolvedValue(8);
      render(<StockCheckPanel counts={null} />);

      await userEvent.type(qtyInput(), "5");
      await userEvent.click(screen.getByRole("button", { name: "Receive stock for Spark Plug" }));

      expect(receiveStock).toHaveBeenCalledWith("spark_plug", 5);
      expect(await screen.findByText("Received 5 of Spark Plug. POS record is now 8.")).toBeInTheDocument();
      expect(qtyInput()).toHaveValue("");
    });

    it("submits with the Enter key", async () => {
      ready(PRODUCTS);
      vi.mocked(receiveStock).mockResolvedValue(13);
      render(<StockCheckPanel counts={null} />);

      await userEvent.type(qtyInput(), "10{Enter}");

      expect(receiveStock).toHaveBeenCalledWith("spark_plug", 10);
    });

    it("keeps the typed quantity and shows a message when saving fails", async () => {
      ready(PRODUCTS);
      vi.mocked(receiveStock).mockRejectedValue({ code: "unavailable" });
      render(<StockCheckPanel counts={null} />);

      await userEvent.type(qtyInput(), "5");
      await userEvent.click(screen.getByRole("button", { name: "Receive stock for Spark Plug" }));

      expect(await screen.findByRole("alert")).toHaveTextContent(/Could not reach the database/);
      expect(qtyInput()).toHaveValue("5");
    });
  });
});
