import { describe, expect, it } from "vitest";
import { emptySales } from "./analytics";
import {
  coverHint,
  coverValue,
  describeChange,
  formatDays,
  formatShare,
  leadHint,
  leadValue,
  profitHint,
  profitValue,
  recommendationText,
  salesValueText,
  uncostedNote,
  unpricedNote,
  whatToDoKind,
  whatToDoLabel,
  whatToDoText,
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
    expect(salesValueText({ ...emptySales(), units: 3, value: 0, unpriced: 3 })).toBe("3 units");
    expect(salesValueText({ ...emptySales(), units: 3, value: 1500 })).toMatch(/1,500/);
    expect(unpricedNote({ ...emptySales(), units: 3, value: 1000 })).toBe("");
    expect(unpricedNote({ ...emptySales(), units: 3, value: 1000, unpriced: 1 })).toBe("1 unit has no price and is not in the value. Set a price in Part Settings.");
    expect(unpricedNote({ ...emptySales(), units: 3, value: 500, unpriced: 2 })).toBe("2 units have no price and are not in the value. Set a price in Part Settings.");
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

  it("words gross profit, with a dash and a next step when nothing had a cost", () => {
    const sold = { ...emptySales(), units: 20, value: 10_000, profit: 3000, profitBase: 10_000 };
    expect(profitValue(sold)).toMatch(/3,000/);
    expect(profitHint(sold, { kind: "change", percent: 12 }, 30)).toBe("30% margin. +12% vs the previous 30 days");
    expect(profitHint(sold, { kind: "new" }, 30)).toBe("30% margin. No sales in the previous 30 days");
    const noCost = { ...emptySales(), units: 4, value: 2000, uncosted: 4 };
    expect(profitValue(noCost)).toBe("—");
    expect(profitHint(noCost, { kind: "none" }, 30)).toBe("Set a cost in Part Settings to see the profit");
    expect(profitValue(emptySales())).toMatch(/0/);
    expect(profitHint(emptySales(), { kind: "none" }, 7)).toBe("No sales in this period");
  });

  it("notes units missing from the profit", () => {
    expect(uncostedNote(emptySales())).toBe("");
    expect(uncostedNote({ ...emptySales(), uncosted: 1 })).toBe("1 unit has no cost and is not in the profit. Set a cost in Part Settings.");
    expect(uncostedNote({ ...emptySales(), uncosted: 3 })).toBe("3 units have no cost and are not in the profit. Set a cost in Part Settings.");
  });

  it("words every action, with a badge kind and a short label that never rely on colour", () => {
    const actions = [
      [{ kind: "scan" }, "Scan the shelf to count this part", "neutral", "Scan Needed"],
      [{ kind: "waiting", state: "Pending" }, "Order placed, waiting for the dealer to accept it", "info", "Order Open"],
      [{ kind: "waiting", state: "Accepted" }, "Order accepted, waiting for the dealer to dispatch it", "info", "Order Open"],
      [{ kind: "waiting", state: "Dispatched" }, "Order on its way: mark it received when it arrives", "info", "Order Open"],
      [{ kind: "due" }, "At the reorder level: an order is raised after two low scans", "warning", "Order Due"],
      [{ kind: "adjust", level: 5, direction: "raise" }, "Raise the reorder level to 5", "info", "Raise Level"],
      [{ kind: "adjust", level: 1, direction: "lower" }, "Lower the reorder level to 1", "info", "Lower Level"],
      [{ kind: "no-sales" }, "No recent sales to base a decision on", "neutral", "No Sales"],
      [{ kind: "not-enough", historyDays: 3, deliveries: 1 }, "Not enough history yet: 3 of 14 days of history, 1 of 2 deliveries received", "neutral", "Too Early"],
      [{ kind: "ok" }, "OK: stock and reorder level fit the sales", "success", "OK"],
    ] as const;
    for (const [action, text, kind, label] of actions) {
      expect(whatToDoText(action, 14, 2)).toBe(text);
      expect(whatToDoKind(action)).toBe(kind);
      expect(whatToDoLabel(action)).toBe(label);
    }
  });
});
