import { describe, expect, it } from "vitest";
import { countOpen, describeOpenCount, sortAlerts } from "./alertSummary";
import type { Alert } from "./types";

const alert = (id: string, state: Alert["state"], iso: string | null): Alert => ({
  id,
  product: "spark_plug",
  visualCount: 3,
  posCount: 4,
  state,
  createdAt: iso ? new Date(iso) : null,
});

describe("sortAlerts", () => {
  it("puts open alerts first, then newest first", () => {
    const sorted = sortAlerts([
      alert("old-ack", "Acknowledged", "2026-10-27T01:00:00Z"),
      alert("old-open", "Open", "2026-10-27T02:00:00Z"),
      alert("new-open", "Open", "2026-10-27T04:00:00Z"),
      alert("new-ack", "Acknowledged", "2026-10-27T05:00:00Z"),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(["new-open", "old-open", "new-ack", "old-ack"]);
  });

  it("treats an alert with no timestamp yet as the newest", () => {
    const sorted = sortAlerts([alert("a", "Open", "2026-10-27T04:00:00Z"), alert("pending", "Open", null)]);
    expect(sorted[0].id).toBe("pending");
  });

  it("does not change the input array", () => {
    const input = [alert("a", "Acknowledged", null), alert("b", "Open", null)];
    sortAlerts(input);
    expect(input.map((a) => a.id)).toEqual(["a", "b"]);
  });
});

describe("counts", () => {
  it("counts only open alerts", () => {
    expect(countOpen([alert("a", "Open", null), alert("b", "Acknowledged", null), alert("c", "Open", null)])).toBe(2);
    expect(countOpen([])).toBe(0);
  });

  it("describes the open count in words", () => {
    expect(describeOpenCount(0)).toBe("No open alerts.");
    expect(describeOpenCount(1)).toBe("1 open alert.");
    expect(describeOpenCount(3)).toBe("3 open alerts.");
  });
});
