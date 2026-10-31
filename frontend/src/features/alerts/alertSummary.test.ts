import { describe, expect, it } from "vitest";
import {
  countOpen,
  dashboardAlerts,
  describeOpenCount,
  filterFor,
  historyCount,
  parseAlertFilter,
  selectAlerts,
  sortAlerts,
  usesHistory,
} from "./alertSummary";
import type { Alert } from "./types";

const alert = (id: string, state: Alert["state"], iso: string | null): Alert => ({
  id,
  product: "spark_plug",
  visualCount: 3,
  posCount: 4,
  state,
  createdAt: iso ? new Date(iso) : null,
  acknowledgedAt: null,
  resolvedAt: null,
});

describe("sortAlerts", () => {
  it("puts open alerts first, then acknowledged, then resolved, newest first within each", () => {
    const sorted = sortAlerts([
      alert("old-res", "Resolved", "2026-10-27T00:30:00Z"),
      alert("old-ack", "Acknowledged", "2026-10-27T01:00:00Z"),
      alert("old-open", "Open", "2026-10-27T02:00:00Z"),
      alert("new-res", "Resolved", "2026-10-27T06:00:00Z"),
      alert("new-open", "Open", "2026-10-27T04:00:00Z"),
      alert("new-ack", "Acknowledged", "2026-10-27T05:00:00Z"),
    ]);
    expect(sorted.map((a) => a.id)).toEqual(["new-open", "old-open", "new-ack", "old-ack", "new-res", "old-res"]);
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

  it("marks a history count as partial while older alerts are not loaded", () => {
    expect(historyCount(12, false)).toBe("12");
    expect(historyCount(50, true)).toBe("50+");
    expect(historyCount(0, false)).toBe("0");
  });
});

describe("filters", () => {
  it("reads the filter from the URL and falls back to Open for anything else", () => {
    expect(parseAlertFilter("acknowledged")).toBe("acknowledged");
    expect(parseAlertFilter("resolved")).toBe("resolved");
    expect(parseAlertFilter("all")).toBe("all");
    expect(parseAlertFilter(null)).toBe("open");
    expect(parseAlertFilter("<script>")).toBe("open");
    expect(parseAlertFilter("toString")).toBe("open");
  });

  it("knows which filters need the paged history", () => {
    expect(usesHistory("open")).toBe(false);
    expect(usesHistory("acknowledged")).toBe(false);
    expect(usesHistory("resolved")).toBe(true);
    expect(usesHistory("all")).toBe(true);
  });

  it("finds the filter that lists an alert in each state", () => {
    expect(filterFor("Open")).toBe("open");
    expect(filterFor("Acknowledged")).toBe("acknowledged");
    expect(filterFor("Resolved")).toBe("resolved");
  });
});

describe("selectAlerts", () => {
  const active = [alert("open1", "Open", "2026-10-27T04:00:00Z"), alert("ack1", "Acknowledged", "2026-10-27T03:00:00Z")];
  // The history page also holds the active alerts (it is every state, newest first).
  const history = [
    alert("open1", "Open", "2026-10-27T04:00:00Z"),
    alert("ack1", "Acknowledged", "2026-10-27T03:00:00Z"),
    alert("res1", "Resolved", "2026-10-27T02:00:00Z"),
    alert("res2", "Resolved", "2026-10-27T01:00:00Z"),
  ];
  const ids = (alerts: Alert[]) => alerts.map((a) => a.id);

  it("takes open and acknowledged alerts from the complete active list", () => {
    expect(ids(selectAlerts(active, [], "open"))).toEqual(["open1"]);
    expect(ids(selectAlerts(active, [], "acknowledged"))).toEqual(["ack1"]);
  });

  it("takes resolved alerts from the history", () => {
    expect(ids(selectAlerts(active, history, "resolved"))).toEqual(["res1", "res2"]);
  });

  it("lists every alert once on All, even when it is in both lists", () => {
    expect(ids(selectAlerts(active, history, "all"))).toEqual(["open1", "ack1", "res1", "res2"]);
  });

  it("trusts the active list over a history row that has not caught up", () => {
    const stale = [alert("ack1", "Open", "2026-10-27T03:00:00Z")];
    const all = selectAlerts(active, stale, "all");
    expect(all.filter((a) => a.id === "ack1")).toEqual([active[1]]);
  });

  it("keeps an active alert older than the loaded history", () => {
    const old = [alert("old-open", "Open", "2026-09-01T00:00:00Z")];
    expect(ids(selectAlerts(old, history.slice(2), "all"))).toEqual(["old-open", "res1", "res2"]);
  });
});

describe("dashboardAlerts", () => {
  it("shows at most the limit, open ones first", () => {
    const many = [
      alert("ack", "Acknowledged", "2026-10-27T09:00:00Z"),
      ...[1, 2, 3, 4, 5, 6].map((h) => alert(`open${h}`, "Open", `2026-10-27T0${h}:00:00Z`)),
    ];
    expect(dashboardAlerts(many, 5).map((a) => a.id)).toEqual(["open6", "open5", "open4", "open3", "open2"]);
    expect(dashboardAlerts(many.slice(0, 2), 5).map((a) => a.id)).toEqual(["open1", "ack"]);
  });
});
