import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import NotificationMenu, { type NotificationItem } from "../../shared/components/NotificationMenu";
import { focusSection } from "../../shared/focusSection";
import { partLabel } from "../dashboard/parts";
import { useAlerts } from "./AlertsContext";
import { sortAlerts } from "./alertSummary";

/** Shopkeeper notifications: the open alerts, newest first. Selecting one jumps to the alerts panel. */
export default function AlertBell() {
  const { alerts, openCount } = useAlerts();
  const navigate = useNavigate();
  const goToAlerts = () => {
    if (!focusSection("alerts-title")) navigate("/dashboard");
  };

  const items = useMemo<NotificationItem[]>(
    () =>
      sortAlerts(alerts)
        .filter((a) => a.state === "Open")
        .map((a) => ({
          id: a.id,
          title: `${partLabel(a.product)} mismatch`,
          detail: `Camera sees ${a.visualCount}, POS says ${a.posCount}.`,
          time: a.createdAt,
          onSelect: goToAlerts,
        })),
    // goToAlerts only closes over navigate, which is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [alerts],
  );

  const label = `Notifications: ${openCount === 0 ? "no" : openCount} open ${openCount === 1 ? "alert" : "alerts"}`;
  return (
    <NotificationMenu
      label={label}
      count={openCount}
      items={items}
      emptyText="No new alerts"
      viewAll={{ label: "View Alerts", onSelect: goToAlerts }}
    />
  );
}
