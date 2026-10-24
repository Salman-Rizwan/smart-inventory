import { describe, expect, it } from "vitest";
import { partLabel } from "./parts";

describe("partLabel", () => {
  it("uses the known display names", () => {
    expect(partLabel("spark_plug")).toBe("Spark Plug");
    expect(partLabel("petrol_filter")).toBe("Petrol Filter");
  });

  it("builds a readable label for classes it has never seen (NFR7)", () => {
    expect(partLabel("brake_pad")).toBe("Brake Pad");
    expect(partLabel("oil__filter_")).toBe("Oil Filter");
  });
});
