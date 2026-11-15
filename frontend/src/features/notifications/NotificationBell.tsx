import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NotificationMenu, { type NotificationItem } from "../../shared/components/NotificationMenu";
import { focusSection } from "../../shared/focusSection";
import { isClosed } from "../orders/orderWorkflow";
import type { OrderState } from "../orders/types";
import { useNotifications } from "./NotificationsContext";
import type { NotificationTarget } from "./types";

const DEGRADED = "Read status is unavailable right now, so everything shows as unread.";

/** The header bell for every role: shows what is unread, and marks things read as they are used. */
export default function NotificationBell() {
  const { role, items, unreadCount, ready, readStateError, saveError, markRead, markAllRead } = useNotifications();
  const navigate = useNavigate();

  const goToAlerts = () => {
    navigate("/alerts");
    window.requestAnimationFrame(() => focusSection("alerts-title"));
  };
  // The Alerts page highlights the alert and moves focus to its row.
  const goToAlert = (alertId: string) => navigate(`/alerts?alert=${encodeURIComponent(alertId)}`);
  // The filter follows the order's state, so a cancelled order opens the Closed view it is listed in.
  const goToOrders = (state?: OrderState) => {
    navigate(state && isClosed(state) ? "/orders?status=closed" : "/orders");
    window.requestAnimationFrame(() => focusSection("orders-title"));
  };
  const goTo = (target: NotificationTarget) =>
    target.kind === "alert" ? goToAlert(target.id) : goToOrders(target.state);

  const menuItems = useMemo<NotificationItem[]>(
    () =>
      items.map((n) => ({
        id: n.key,
        title: n.title,
        detail: n.detail,
        time: n.time,
        unread: n.unread,
        onSelect: () => {
          markRead([n.key]);
          goTo(n.target);
        },
      })),
    // goTo only closes over navigate, which is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [items, markRead],
  );

  const label = ready ? `Notifications: ${unreadCount === 0 ? "none" : unreadCount} unread` : "Notifications";
  return (
    <NotificationMenu
      label={label}
      count={unreadCount}
      items={menuItems}
      emptyText="No notifications"
      viewAll={role === "dealer" ? { label: "View Orders", onSelect: () => goToOrders() } : { label: "View Alerts", onSelect: goToAlerts }}
      onMarkAllRead={markAllRead}
      notice={readStateError ? DEGRADED : saveError || undefined}
    />
  );
}
