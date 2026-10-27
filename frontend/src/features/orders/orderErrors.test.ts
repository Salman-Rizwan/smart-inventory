import { describe, expect, it } from "vitest";
import { StockError } from "../inventory/stock";
import { orderErrorMessage } from "./orderErrors";
import { OrderError } from "./orderWorkflow";

describe("orderErrorMessage", () => {
  it("explains a refused update and says what to try", () => {
    expect(orderErrorMessage({ code: "permission-denied" }, "#ABC123")).toMatch(/#ABC123.*already have moved on.*Refresh/);
  });

  it("explains an unreachable database", () => {
    expect(orderErrorMessage({ code: "unavailable" }, "#ABC123")).toMatch(/Could not reach the database/);
  });

  it.each([
    ["not_found", /no longer exists.*Refresh/],
    ["not_dispatched", /already been received.*Refresh/],
    ["product_missing", /stock record.*Ask your administrator/],
  ] as const)("explains %s with a next step", (code, pattern) => {
    expect(orderErrorMessage(new OrderError(code), "#ABC123")).toMatch(pattern);
  });

  it("explains a POS record that would overflow", () => {
    expect(orderErrorMessage(new StockError("too_large"), "#ABC123")).toMatch(/100,000.*administrator/);
  });

  it("never leaks raw error text", () => {
    const message = orderErrorMessage(new Error("internal secret"), "#ABC123");
    expect(message).not.toMatch(/secret/);
    expect(message).toMatch(/could not be updated/);
    expect(orderErrorMessage(undefined, "#ABC123")).toMatch(/could not be updated/);
  });
});
