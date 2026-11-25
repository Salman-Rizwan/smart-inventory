import { describe, expect, it } from "vitest";
import { chart } from "../../shared/theme/tokens";
import { bucketLabel, labelEvery, seriesColor } from "./chartSupport";

describe("chart support", () => {
  it("labels every day over a week, then every 5th or 15th, half as often on a phone", () => {
    expect([labelEvery(7), labelEvery(30), labelEvery(90)]).toEqual([1, 5, 15]);
    expect([labelEvery(7, true), labelEvery(30, true), labelEvery(90, true)]).toEqual([2, 10, 30]);
  });

  it("labels every other bar of 13 weekly bars, and every 5th of 30 daily ones", () => {
    expect(labelEvery(13)).toBe(2);
    expect(labelEvery(13, true)).toBe(4);
    expect(labelEvery(30)).toBe(5);
  });

  it("names a bar's period: the day, or the first and last day of the week", () => {
    const day = new Date(2026, 10, 12);
    expect(bucketLabel({ start: day, end: day, days: 1 })).toBe(new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(day));
    const short = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short" });
    expect(bucketLabel({ start: new Date(2026, 10, 6), end: day, days: 7 })).toBe(`${short.format(new Date(2026, 10, 6))} to ${short.format(day)}`);
  });

  it("assigns series colours in a fixed order and never cycles past the list", () => {
    expect(seriesColor(0)).toBe(chart.series[0]);
    expect(seriesColor(1)).toBe(chart.series[1]);
    expect(seriesColor(9)).toBe(chart.series[chart.series.length - 1]);
  });
});
