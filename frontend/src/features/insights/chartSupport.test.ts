import { describe, expect, it } from "vitest";
import { chart } from "../../shared/theme/tokens";
import { labelEvery, seriesColor } from "./chartSupport";

describe("chart support", () => {
  it("labels every day over a week, then every 5th or 15th, half as often on a phone", () => {
    expect([labelEvery(7), labelEvery(30), labelEvery(90)]).toEqual([1, 5, 15]);
    expect([labelEvery(7, true), labelEvery(30, true), labelEvery(90, true)]).toEqual([2, 10, 30]);
  });

  it("assigns series colours in a fixed order and never cycles past the list", () => {
    expect(seriesColor(0)).toBe(chart.series[0]);
    expect(seriesColor(1)).toBe(chart.series[1]);
    expect(seriesColor(9)).toBe(chart.series[chart.series.length - 1]);
  });
});
