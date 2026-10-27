import { describe, expect, it } from "vitest";
import { orderErrorMessage } from "./orderErrors";

describe("orderErrorMessage", () => {
  it("explains a refused update and says what to try", () => {
    expect(orderErrorMessage({ code: "permission-denied" }, "#ABC123")).toMatch(/#ABC123.*already have moved on.*Refresh/);
  });

  it("explains an unreachable database", () => {
    expect(orderErrorMessage({ code: "unavailable" }, "#ABC123")).toMatch(/Could not reach the database/);
  });

  it("never leaks raw error text", () => {
    const message = orderErrorMessage(new Error("internal secret"), "#ABC123");
    expect(message).not.toMatch(/secret/);
    expect(message).toMatch(/could not be updated/);
    expect(orderErrorMessage(undefined, "#ABC123")).toMatch(/could not be updated/);
  });
});
