import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NotificationMenu, { type NotificationItem } from "../../shared/components/NotificationMenu";
import { focusSection } from "../../shared/focusSection";
import { formatInteger } from "../../shared/format";
import { partLabel } from "../dashboard/parts";
import { useOrders } from "./OrdersContext";
import { shortId, sortOrders } from "./orderWorkflow";

/** Dealer notifications: orders waiting for acceptance, oldest first. Selecting one opens the orders page. */
export default function OrderBell() {
  const { orders, pendingCount } = useOrders();
  const navigate = useNavigate();
  const goToOrders = () => {
    navigate("/orders");
    window.requestAnimationFrame(() => focusSection("orders-title"));
  };

  const items = useMemo<NotificationItem[]>(
    () =>
      sortOrders(orders)
        .filter((o) => o.state === "Pending")
        .map((o) => ({
          id: o.id,
          title: `Order ${shortId(o.id)} needs acceptance`,
          detail: `${formatInteger(o.qty)} × ${partLabel(o.product)}`,
          time: o.createdAt,
          onSelect: goToOrders,
        })),
    // goToOrders only closes over navigate, which is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orders],
  );

  const label = `Notifications: ${pendingCount === 0 ? "no" : pendingCount} pending ${pendingCount === 1 ? "order" : "orders"}`;
  return (
    <NotificationMenu
      label={label}
      count={pendingCount}
      items={items}
      emptyText="No pending orders"
      viewAll={{ label: "View Orders", onSelect: goToOrders }}
    />
  );
}
