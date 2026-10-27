import { formatInteger } from "../../shared/format";
import type { Alert } from "../alerts/types";
import { partLabel } from "../dashboard/parts";
import { shortId } from "../orders/orderWorkflow";
import type { Order, OrderRole } from "../orders/types";
import type { AppNotification, NotificationView } from "./types";

export const alertKey = (alertId: string): string => `alert:${alertId}`;
export const orderKey = (orderId: string, state: string): string => `order:${orderId}:${state}`;

/**
 * Notifications are derived from live data, never stored: an item exists exactly while the thing it
 * is about still needs this role's attention, so resolving or handling it removes it by itself.
 * - shopkeeper: open alerts (an acknowledged alert is handled, so it is no longer listed) and
 *   dispatched orders waiting for confirmation
 * - dealer: pending orders waiting for acceptance
 */
export function deriveNotifications(role: OrderRole, alerts: Alert[], orders: Order[]): AppNotification[] {
  const items: AppNotification[] = [];
  if (role === "shopkeeper") {
    for (const alert of alerts) {
      if (alert.state !== "Open") continue;
      items.push({
        key: alertKey(alert.id),
        title: `${partLabel(alert.product)} mismatch`,
        detail: `Camera sees ${alert.visualCount}, POS says ${alert.posCount}.`,
        time: alert.createdAt,
        target: { kind: "alert", id: alert.id },
      });
    }
    for (const order of orders) {
      if (order.state !== "Dispatched") continue;
      items.push({
        key: orderKey(order.id, "Dispatched"),
        title: `Order ${shortId(order.id)} is on the way`,
        detail: `${formatInteger(order.qty)} × ${partLabel(order.product)}. Mark it received when it arrives.`,
        time: order.dispatchedAt ?? order.createdAt,
        target: { kind: "order", id: order.id, state: "Dispatched" },
      });
    }
  } else {
    for (const order of orders) {
      if (order.state !== "Pending") continue;
      items.push({
        key: orderKey(order.id, "Pending"),
        title: `Order ${shortId(order.id)} needs acceptance`,
        detail: `${formatInteger(order.qty)} × ${partLabel(order.product)}`,
        time: order.createdAt,
        target: { kind: "order", id: order.id, state: "Pending" },
      });
    }
  }
  return items;
}

/** Unread first, then newest first. An item with no timestamp yet counts as the newest. */
export function sortNotifications(items: NotificationView[]): NotificationView[] {
  const time = (n: NotificationView) => n.time?.getTime() ?? Number.MAX_SAFE_INTEGER;
  return [...items].sort((a, b) => {
    if (a.unread !== b.unread) return a.unread ? -1 : 1;
    return time(b) - time(a);
  });
}
