import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./AlertsContext", () => ({ useAlerts: vi.fn() }));
vi.mock("./useAlertHistory", () => ({ useAlertHistory: vi.fn() }));
vi.mock("./alertRepository", () => ({ acknowledgeAlert: vi.fn() }));

import { acknowledgeAlert } from "./alertRepository";
import { useAlerts } from "./AlertsContext";
import AlertsPage from "./AlertsPage";
import type { Alert } from "./types";
import { useAlertHistory, type AlertHistory } from "./useAlertHistory";

const at = (hour: number) => new Date(`2026-10-27T${String(hour).padStart(2, "0")}:00:00Z`);
const alert = (id: string, state: Alert["state"], product = "spark_plug", hour = 5, extra: Partial<Alert> = {}): Alert => ({
  id,
  product,
  state,
  visualCount: 3,
  posCount: 4,
  createdAt: at(hour),
  acknowledgedAt: null,
  resolvedAt: null,
  ...extra,
});

const OPEN = alert("open1", "Open", "spark_plug", 9);
const ACK = alert("ack1", "Acknowledged", "petrol_filter", 8, { acknowledgedAt: at(8) });
const RES1 = alert("res1", "Resolved", "spark_plug", 6, { resolvedAt: at(7) });
const RES2 = alert("res2", "Resolved", "petrol_filter", 4, { acknowledgedAt: at(4), resolvedAt: at(5) });

const provideActive = (alerts: Alert[], extra: Partial<ReturnType<typeof useAlerts>> = {}) =>
  vi.mocked(useAlerts).mockReturnValue({
    enabled: true,
    alerts,
    openCount: alerts.filter((a) => a.state === "Open").length,
    loading: false,
    error: "",
    ...extra,
  });

const loadMore = vi.fn();
const provideHistory = (alerts: Alert[], extra: Partial<AlertHistory> = {}) =>
  vi.mocked(useAlertHistory).mockReturnValue({ alerts, hasMore: false, loading: false, loadingMore: false, error: "", loadMore, ...extra });

const provide = (active = [OPEN, ACK], history = [OPEN, ACK, RES1, RES2], historyExtra: Partial<AlertHistory> = {}) => {
  provideActive(active);
  provideHistory(history, historyExtra);
};

const renderPage = (path = "/alerts") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AlertsPage />
    </MemoryRouter>,
  );

const bodyRows = () => screen.getAllByRole("row").slice(1);

describe("AlertsPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "error").mockImplementation(() => {});
    window.matchMedia = vi.fn().mockReturnValue({ matches: true }) as unknown as typeof window.matchMedia;
    Element.prototype.scrollIntoView = vi.fn();
  });

  describe("states", () => {
    it("shows loading and no tiles while the active alerts load", () => {
      provideActive([], { loading: true });
      provideHistory([], { loading: true });
      renderPage();
      expect(screen.getByText("Loading alerts…")).toBeInTheDocument();
      expect(screen.queryByText("Needs your action")).not.toBeInTheDocument();
    });

    it("shows a load error with a next step", () => {
      provideActive([], { error: "Alerts could not be loaded. Check your connection and sign in again if this continues." });
      provideHistory([]);
      renderPage();
      expect(screen.getByRole("alert")).toHaveTextContent(/Check your connection/);
    });

    it("shows the history's error only on the filters that use it", async () => {
      provideActive([OPEN]);
      provideHistory([], { error: "Past alerts could not be loaded. Check your connection and refresh the page." });
      renderPage();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Resolved —" })).toBeInTheDocument(); // not "0": it is unknown
      await userEvent.click(screen.getByRole("button", { name: /^Resolved/ }));
      expect(screen.getByRole("alert")).toHaveTextContent(/Past alerts could not be loaded/);
    });

    it.each([
      ["open", "No open alerts"],
      ["acknowledged", "No acknowledged alerts"],
      ["resolved", "No resolved alerts yet"],
      ["all", "No alerts yet"],
    ])("explains an empty %s list", (status, title) => {
      provide([], []);
      renderPage(status === "open" ? "/alerts" : `/alerts?status=${status}`);
      expect(screen.getByText(title)).toBeInTheDocument();
      expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });
  });

  describe("summary", () => {
    it("shows a tile per state, amber when alerts are open", () => {
      provide();
      renderPage();
      const tile = (label: string) => screen.getByText(label, { selector: "dt" }).closest("div") as HTMLElement;
      expect(within(tile("Open")).getByText("1")).toBeInTheDocument();
      expect(within(tile("Open")).getByText("Needs your action")).toBeInTheDocument();
      expect(within(tile("Acknowledged")).getByText("1")).toBeInTheDocument();
      expect(within(tile("Resolved")).getByText("2")).toBeInTheDocument();
    });

    it("shows … on the history counts while the history loads, not a misleading number", () => {
      provideActive([OPEN]);
      provideHistory([], { loading: true });
      renderPage();
      expect(screen.getByRole("button", { name: "Resolved …" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All …" })).toBeInTheDocument();
    });

    it("marks resolved counts as partial while older alerts are not loaded", () => {
      provide(undefined, undefined, { hasMore: true });
      renderPage();
      expect(screen.getByRole("button", { name: "Resolved 2+" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "All 4+" })).toBeInTheDocument();
    });

    it("announces the open count to screen readers", () => {
      provide();
      renderPage();
      expect(screen.getAllByRole("status").some((el) => el.textContent === "1 open alert.")).toBe(true);
    });
  });

  describe("filters", () => {
    it("shows each filter's count, with a space so it reads \"Open 1\"", () => {
      provide();
      renderPage();
      const group = screen.getByRole("group", { name: "Filter alerts" });
      expect(within(group).getAllByRole("button").map((b) => b.textContent)).toEqual([
        "Open 1",
        "Acknowledged 1",
        "Resolved 2",
        "All 4",
      ]);
    });

    it("lists open alerts by default, with an Acknowledge button", () => {
      provide();
      renderPage();
      expect(screen.getByRole("button", { name: /^Open/ })).toHaveAttribute("aria-pressed", "true");
      expect(bodyRows()).toHaveLength(1);
      expect(within(bodyRows()[0]).getByRole("button", { name: "Acknowledge Spark Plug alert" })).toBeInTheDocument();
    });

    it("lists resolved alerts with when they were raised, acknowledged and resolved", async () => {
      provide();
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: /^Resolved/ }));
      expect(screen.getByRole("button", { name: /^Resolved/ })).toHaveAttribute("aria-pressed", "true");
      const rows = bodyRows();
      expect(rows).toHaveLength(2);
      const cells = within(rows[1]).getAllByRole("cell");
      // The part is the row header, so the cells are: on shelf, POS, raised, acknowledged, resolved, status, action.
      expect(cells[2]).toHaveTextContent(/\d/);
      expect(cells[3]).toHaveTextContent(/\d/);
      expect(cells[4]).toHaveTextContent(/\d/);
      expect(within(rows[0]).getAllByRole("cell")[3]).toHaveTextContent("—"); // resolved without being acknowledged
      expect(within(rows[0]).queryByRole("button")).not.toBeInTheDocument();
      expect(screen.getByText("A resolved alert keeps the last mismatch the camera saw.")).toBeInTheDocument();
    });

    it("lists every alert once on All, open first", async () => {
      provide();
      renderPage("/alerts?status=all");
      expect(bodyRows().map((r) => within(r).getAllByRole("cell")[4].textContent === "—")).toEqual([true, true, false, false]);
      expect(bodyRows()[0]).toHaveTextContent("Open");
      expect(bodyRows()[1]).toHaveTextContent("Acknowledged");
    });

    it("ignores a filter it does not know", () => {
      provide();
      renderPage("/alerts?status=%3Cscript%3E");
      expect(screen.getByRole("button", { name: /^Open/ })).toHaveAttribute("aria-pressed", "true");
    });
  });

  describe("Load More", () => {
    it("is offered only while older alerts exist", () => {
      provide(undefined, undefined, { hasMore: true });
      renderPage("/alerts?status=resolved");
      expect(screen.getByText("The newest 4 alerts are loaded.")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Load More Alerts" })).toBeInTheDocument();
    });

    it("loads the next page", async () => {
      provide(undefined, undefined, { hasMore: true });
      renderPage("/alerts?status=resolved");
      await userEvent.click(screen.getByRole("button", { name: "Load More Alerts" }));
      expect(loadMore).toHaveBeenCalledTimes(1);
    });

    it("shows that it is busy while the next page loads", () => {
      provide(undefined, undefined, { hasMore: true, loadingMore: true });
      renderPage("/alerts?status=resolved");
      expect(screen.getByRole("button", { name: /Loading…/ })).toBeDisabled();
    });

    it("says everything is loaded when there is nothing more, and is not offered on Open", () => {
      provide();
      const { unmount } = renderPage("/alerts?status=all");
      expect(screen.getByText("All 4 alerts are loaded.")).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Load More Alerts" })).not.toBeInTheDocument();
      unmount();
      provide(undefined, undefined, { hasMore: true });
      renderPage();
      expect(screen.queryByRole("button", { name: "Load More Alerts" })).not.toBeInTheDocument();
    });

    it("keeps keyboard focus when the button goes away after the last page", async () => {
      provide(undefined, undefined, { hasMore: true });
      const { rerender } = renderPage("/alerts?status=resolved");
      await userEvent.click(screen.getByRole("button", { name: "Load More Alerts" }));
      provide();
      rerender(
        <MemoryRouter initialEntries={["/alerts?status=resolved"]}>
          <AlertsPage />
        </MemoryRouter>,
      );
      expect(screen.getByText("All 4 alerts are loaded.")).toHaveFocus();
    });
  });

  describe("opened from a notification", () => {
    it("highlights the alert and moves focus to its row", () => {
      provide();
      renderPage("/alerts?alert=open1");
      const row = screen.getByRole("row", { name: /Spark Plug \(opened from a notification\)/ });
      expect(row).toHaveFocus();
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: "auto", block: "center" });
    });

    it("switches to the filter that holds the alert when it has moved on", () => {
      provide();
      renderPage("/alerts?alert=res1");
      expect(screen.getByRole("button", { name: /^Resolved/ })).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByRole("row", { name: /opened from a notification/ })).toHaveFocus();
    });

    it("says so when the alert is not in the list", () => {
      provide();
      renderPage("/alerts?alert=gone");
      expect(screen.getByText(/The alert from that notification is no longer listed\. Choose All/)).toBeInTheDocument();
    });

    it("highlights nothing on a normal visit", () => {
      provide();
      renderPage();
      expect(screen.queryByRole("row", { name: /opened from a notification/ })).not.toBeInTheDocument();
    });
  });

  describe("acknowledging", () => {
    it("acknowledges an open alert and says what happens next", async () => {
      provide();
      vi.mocked(acknowledgeAlert).mockResolvedValue(undefined);
      renderPage();
      await userEvent.click(screen.getByRole("button", { name: "Acknowledge Spark Plug alert" }));
      expect(acknowledgeAlert).toHaveBeenCalledWith("open1");
      expect(await screen.findByText(/Spark Plug alert acknowledged\. It closes by itself/)).toBeInTheDocument();
    });

    it("shows a next step when refused, without leaking details, and keeps the button", async () => {
      provide();
      vi.mocked(acknowledgeAlert).mockRejectedValue({ code: "permission-denied", message: "secret rule detail" });
      renderPage();
      const button = screen.getByRole("button", { name: "Acknowledge Spark Plug alert" });
      await userEvent.click(button);
      const error = await screen.findByRole("alert");
      expect(error).toHaveTextContent(/Refresh the page/);
      expect(error).not.toHaveTextContent("secret");
      expect(button).toBeEnabled();
      expect(button).toHaveAttribute("aria-describedby", error.closest("td")?.id);
    });
  });
});
