import { describe, expect, it } from "vitest";
import { StockError } from "./stock";
import { stockErrorMessage } from "./stockErrors";

describe("stockErrorMessage", () => {
  it("explains a sale on an empty record and says what to do next", () => {
    expect(stockErrorMessage(new StockError("insufficient"), "Spark Plug")).toMatch(/already 0.*Receive stock first/);
  });

  it.each(["too_large", "invalid_quantity", "not_found", "invalid_record"] as const)("has a message for %s", (code) => {
    expect(stockErrorMessage(new StockError(code), "Spark Plug").length).toBeGreaterThan(20);
  });

  it("explains a permission failure", () => {
    expect(stockErrorMessage({ code: "permission-denied" }, "Spark Plug")).toMatch(/permission.*shopkeeper/i);
  });

  it("explains an unreachable database", () => {
    expect(stockErrorMessage({ code: "unavailable" }, "Spark Plug")).toMatch(/Could not reach the database/);
  });

  it("never leaks raw error text", () => {
    const message = stockErrorMessage(new Error("internal stack trace with secrets"), "Spark Plug");
    expect(message).not.toMatch(/secrets|stack/);
    expect(message).toMatch(/could not be updated/);
    expect(stockErrorMessage(null, "Spark Plug")).toMatch(/could not be updated/);
  });
});
