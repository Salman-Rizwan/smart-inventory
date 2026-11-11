import { describe, expect, it } from "vitest";
import { StockError } from "../inventory/stock";
import { cancelErrorMessage, orderErrorMessage } from "./orderErrors";
import { OrderError } from "./orderWorkflow";

describe("orderErrorMessage", () => {
  it("explains a refusal that is about the account, and says what to try", () => {
    expect(orderErrorMessage({ code: "permission-denied" }, "#ABC123")).toMatch(/account.*#ABC123.*Refresh.*administrator/);
  });

  it("says an order received by someone else was counted once, with nothing left to do", () => {
    expect(orderErrorMessage(new OrderError("moved_on", "Received"), "#ABC123")).toBe(
      "Order #ABC123 has already been received. Its quantity was added to the POS record once, so there is nothing more to do.",
    );
  });

  it.each([
    ["Accepted", "Order #ABC123 has already been accepted. The list shows its latest status."],
    ["Dispatched", "Order #ABC123 has already been dispatched. The list shows its latest status."],
  ] as const)("says an order already %s moved on", (state, message) => {
    expect(orderErrorMessage(new OrderError("moved_on", state), "#ABC123")).toBe(message);
  });

  it("tells the dealer an order was cancelled by the shop", () => {
    expect(orderErrorMessage(new OrderError("moved_on", "Cancelled"), "#ABC123")).toBe(
      "Order #ABC123 has been cancelled by the shop, so there is nothing more to do.",
    );
  });

  it("falls back to a general moved-on message", () => {
    expect(orderErrorMessage(new OrderError("moved_on"), "#ABC123")).toMatch(/changed since you opened it/);
  });

  it("explains an unreachable database", () => {
    expect(orderErrorMessage({ code: "unavailable" }, "#ABC123")).toMatch(/Could not reach the database/);
  });

  it.each([
    ["not_found", /no longer exists.*Refresh/],
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

describe("cancelErrorMessage", () => {
  it("says a dispatched order is on its way and what to do instead", () => {
    expect(cancelErrorMessage(new OrderError("moved_on", "Dispatched"), "#ABC123")).toBe(
      "Order #ABC123 has already been dispatched, so it can no longer be cancelled. Mark it received when it arrives.",
    );
  });

  it("names who may cancel when the account is refused", () => {
    expect(cancelErrorMessage({ code: "permission-denied" }, "#ABC123")).toMatch(/Only the shopkeeper can cancel an order/);
  });

  it("reuses the order messages otherwise, worded for a cancel", () => {
    expect(cancelErrorMessage(new OrderError("moved_on", "Cancelled"), "#ABC123")).toMatch(/already|has been cancelled/);
    expect(cancelErrorMessage(new Error("x"), "#ABC123")).toBe("Order #ABC123 could not be cancelled. Please try again.");
  });
});
