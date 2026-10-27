import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./NotificationsContext", () => ({ useNotifications: vi.fn() }));

import NotificationBell from "./NotificationBell";
import { useNotifications } from "./NotificationsContext";
import type { NotificationView } from "./types";

const alertItem = (id: string, unread = true): NotificationView => ({
  key: `alert:${id}`,
  title: "Spark Plug mismatch",
  detail: "Camera sees 3, POS says 4.",
  time: new Date("2026-10-27T05:00:00Z"),
  unread,
  target: { kind: "alert", id },
});
const orderItem = (id: string, state: "Pending" | "Dispatched", unread = true): NotificationView => ({
  key: `order:${id}:${state}`,
  title: `Order #${id.toUpperCase()} ${state === "Pending" ? "needs acceptance" : "is on the way"}`,
  detail: "10 × Petrol Filter",
  time: new Date("2026-10-27T05:00:00Z"),
  unread,
  target: { kind: "order", id, state },
});

const markRead = vi.fn();
const markAllRead = vi.fn();

function provide(items: NotificationView[], extra: Partial<ReturnType<typeof useNotifications>> = {}) {
  vi.mocked(useNotifications).mockReturnValue({
    role: "shopkeeper",
    items,
    unreadCount: items.filter((i) => i.unread).length,
    ready: true,
    readStateError: false,
    saveError: "",
    markRead,
    markAllRead,
    ...extra,
  });
}

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

const renderBell = () =>
  render(
    <MemoryRouter initialEntries={["/dashboard"]}>
      <NotificationBell />
      <Where />
      <Routes>
        <Route path="/dashboard" element={<h2 id="alerts-title" tabIndex={-1}>Active Alerts</h2>} />
        <Route path="/orders" element={<h1 id="orders-title" tabIndex={-1}>Purchase Orders</h1>} />
      </Routes>
    </MemoryRouter>,
  );

describe("NotificationBell", () => {
  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false }) as unknown as typeof window.matchMedia;
    Element.prototype.scrollIntoView = vi.fn();
  });
  afterEach(() => vi.clearAllMocks());

  describe("the bell", () => {
    it("says how many are unread, singular and plural, and none when all are read", () => {
      provide([alertItem("a1")]);
      const { unmount } = renderBell();
      expect(screen.getByRole("button", { name: "Notifications: 1 unread" })).toBeInTheDocument();
      unmount();
      provide([alertItem("a1"), alertItem("a2")]);
      const second = renderBell();
      expect(screen.getByRole("button", { name: "Notifications: 2 unread" })).toBeInTheDocument();
      second.unmount();
      provide([alertItem("a1", false)]);
      renderBell();
      expect(screen.getByRole("button", { name: "Notifications: none unread" })).toBeInTheDocument();
      expect(screen.queryByText("0")).not.toBeInTheDocument();
    });

    it("shows no count while the data is still loading", () => {
      provide([alertItem("a1")], { ready: false, unreadCount: 0 });
      renderBell();
      expect(screen.getByRole("button", { name: "Notifications" })).toBeInTheDocument();
    });
  });

  describe("choosing a notification", () => {
    it("marks it read, closes the menu and moves focus to the alerts panel", async () => {
      provide([alertItem("a1")]);
      renderBell();
      await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      await userEvent.click(screen.getByRole("button", { name: /Spark Plug mismatch/ }));

      expect(markRead).toHaveBeenCalledWith(["alert:a1"]);
      expect(screen.queryByRole("region", { name: "Notifications" })).not.toBeInTheDocument();
      expect(screen.getByRole("heading", { name: "Active Alerts" })).toHaveFocus();
    });

    it("marks an order read and opens the orders page", async () => {
      provide([orderItem("abc123", "Dispatched")]);
      renderBell();
      await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      await userEvent.click(screen.getByRole("button", { name: /Order #ABC123/ }));

      expect(markRead).toHaveBeenCalledWith(["order:abc123:Dispatched"]);
      expect(screen.getByTestId("where")).toHaveTextContent("/orders");
      await waitFor(() => expect(screen.getByRole("heading", { name: "Purchase Orders" })).toHaveFocus());
    });

    it("still takes you there when the item was already read", async () => {
      provide([alertItem("a1", false)]);
      renderBell();
      await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      await userEvent.click(screen.getByRole("button", { name: /Spark Plug mismatch/ }));
      expect(screen.getByRole("heading", { name: "Active Alerts" })).toHaveFocus();
    });
  });

  describe("Mark All as Read", () => {
    it("marks everything read and keeps the menu open", async () => {
      provide([alertItem("a1"), orderItem("o1", "Dispatched")]);
      renderBell();
      await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      await userEvent.click(screen.getByRole("button", { name: "Mark All as Read" }));
      expect(markAllRead).toHaveBeenCalledTimes(1);
      expect(screen.getByRole("region", { name: "Notifications" })).toBeInTheDocument();
    });
  });

  describe("by role", () => {
    it("offers the shopkeeper View Alerts", async () => {
      provide([alertItem("a1")]);
      renderBell();
      await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      await userEvent.click(screen.getByRole("button", { name: "View Alerts" }));
      expect(screen.getByRole("heading", { name: "Active Alerts" })).toHaveFocus();
    });

    it("offers the dealer View Orders", async () => {
      provide([orderItem("o1", "Pending")], { role: "dealer" });
      renderBell();
      await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      await userEvent.click(screen.getByRole("button", { name: "View Orders" }));
      expect(screen.getByTestId("where")).toHaveTextContent("/orders");
    });
  });

  describe("empty and degraded", () => {
    it("shows an empty state when there is nothing", async () => {
      provide([]);
      renderBell();
      await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      expect(screen.getByText("No notifications")).toBeInTheDocument();
    });

    it("explains when read status is unavailable", async () => {
      provide([alertItem("a1")], { readStateError: true });
      renderBell();
      await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      expect(screen.getByText(/Read status is unavailable right now/)).toBeInTheDocument();
    });

    it("shows a save failure", async () => {
      provide([alertItem("a1")], { saveError: "Could not save that as read." });
      renderBell();
      await userEvent.click(screen.getByRole("button", { name: /^Notifications/ }));
      expect(screen.getByText("Could not save that as read.")).toBeInTheDocument();
    });
  });
});
