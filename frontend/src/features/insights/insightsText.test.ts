import { describe, expect, it } from "vitest";
import {
  coverHint,
  coverValue,
  describeChange,
  formatDays,
  formatShare,
  leadHint,
  leadValue,
  recommendationText,
  salesValueText,
  unpricedNote,
} from "./insightsText";

describe("insights wording", () => {
  it("formats days with one decimal below ten, whole above, and a cap", () => {
    expect(formatDays(2.46)).toBe("2.5");
    expect(formatDays(12.6)).toBe("13");
    expect(formatDays(400)).toBe("365+");
  });

  it("formats a share or a dash", () => {
    expect(formatShare(0.165)).toBe("17%");
    expect(formatShare(null)).toBe("—");
  });

  it("describes the change against the previous period in every case", () => {
    expect(describeChange({ kind: "change", percent: 20 }, 30)).toBe("+20% vs the previous 30 days");
    expect(describeChange({ kind: "change", percent: -5 }, 7)).toBe("-5% vs the previous 7 days");
    expect(describeChange({ kind: "change", percent: 0 }, 7)).toBe("0% vs the previous 7 days");
    expect(describeChange({ kind: "new" }, 30)).toBe("No sales in the previous 30 days");
    expect(describeChange({ kind: "none" }, 30)).toBe("No sales in this or the previous period");
    expect(describeChange({ kind: "unknown" }, 90)).toBe("No earlier period loaded to compare with");
  });

  it("shows units instead of a value when nothing had a price, and notes missing prices", () => {
    expect(salesValueText({ units: 3, value: 0, unpriced: 3 })).toBe("3 units");
    expect(salesValueText({ units: 3, value: 1500, unpriced: 0 })).toMatch(/1,500/);
    expect(unpricedNote({ units: 3, value: 1000, unpriced: 0 })).toBe("");
    expect(unpricedNote({ units: 3, value: 1000, unpriced: 1 })).toBe("1 unit has no price and is not in the value. Set a price in Part Settings.");
    expect(unpricedNote({ units: 3, value: 500, unpriced: 2 })).toBe("2 units have no price and are not in the value. Set a price in Part Settings.");
  });

  it("words days of cover and its edge cases", () => {
    expect(coverValue({ kind: "cover", days: 6.3, untilReorder: 3.2 })).toBe("6.3 days");
    expect(coverHint({ kind: "cover", days: 6.3, untilReorder: 3.2 }, 2)).toBe("3.2 days until the reorder level of 2");
    expect(coverHint({ kind: "cover", days: 1, untilReorder: 0 }, 2)).toBe("At or below the reorder level of 2");
    expect(coverValue({ kind: "no-sales" })).toBe("No recent sales");
    expect(coverHint({ kind: "no-sales" }, 2)).toMatch(/cannot be worked out/);
    expect(coverValue({ kind: "no-scan" })).toBe("No scan yet");
    expect(coverHint({ kind: "no-scan" }, 2)).toBe("Scan the shelf to count this part");
  });

  it("words the dealer lead time", () => {
    expect(leadValue({ days: 2.5, deliveries: 4 })).toBe("2.5 days");
    expect(leadHint({ days: 2.5, deliveries: 4 })).toBe("Median of 4 deliveries, order to receipt");
    expect(leadHint({ days: 2.5, deliveries: 1 })).toBe("Median of 1 delivery, order to receipt");
    expect(leadValue(null)).toBe("No deliveries yet");
    expect(leadHint(null)).toMatch(/once an order has been received/);
  });

  it("turns a recommendation into an action, or says what is missing", () => {
    expect(recommendationText({ kind: "ok", level: 5, leadDemand: 3, safety: 2 }, 2, 14, 2)).toBe("Raise the reorder level from 2 to 5");
    expect(recommendationText({ kind: "ok", level: 1, leadDemand: 0.5, safety: 1 }, 3, 14, 2)).toBe("Lower the reorder level from 3 to 1");
    expect(recommendationText({ kind: "ok", level: 2, leadDemand: 1, safety: 1 }, 2, 14, 2)).toBe("Keep the reorder level at 2");
    expect(recommendationText({ kind: "no-sales" }, 2, 14, 2)).toBe("No recent sales to base a suggestion on");
    expect(recommendationText({ kind: "not-enough", historyDays: 3, deliveries: 1 }, 2, 14, 2)).toBe(
      "Not enough history yet: 3 of 14 days of history, 1 of 2 deliveries received",
    );
    expect(recommendationText({ kind: "not-enough", historyDays: 30, deliveries: 0 }, 2, 14, 2)).toBe(
      "Not enough history yet: 0 of 2 deliveries received",
    );
  });
});
