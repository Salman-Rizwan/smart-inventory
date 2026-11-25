import { describe, expect, it } from "vitest";
import { alertErrorMessage } from "./alertErrors";

describe("alertErrorMessage", () => {
  it("explains a refused acknowledge and says what to try", () => {
    expect(alertErrorMessage({ code: "permission-denied" }, "Spark Plug")).toMatch(/already be resolved.*Refresh/);
  });

  it("explains an unreachable database", () => {
    expect(alertErrorMessage({ code: "unavailable" }, "Spark Plug")).toMatch(/Could not reach the database/);
  });

  it("never leaks raw error text", () => {
    const message = alertErrorMessage(new Error("internal detail"), "Spark Plug");
    expect(message).not.toMatch(/internal/);
    expect(message).toMatch(/could not be acknowledged/);
    expect(alertErrorMessage(null, "Spark Plug")).toMatch(/could not be acknowledged/);
  });
});
