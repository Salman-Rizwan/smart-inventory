import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useSubscription, type Subscribe } from "../../shared/hooks/useSubscription";
import { useTitleCount } from "../../shared/hooks/useTitleCount";
import { useAlerts } from "../alerts/AlertsContext";
import { useOrders } from "../orders/OrdersContext";
import type { OrderRole } from "../orders/types";
import { deriveNotifications, sortNotifications } from "./deriveNotifications";
import { markKeysRead, pruneReadKeys, subscribeReadKeys } from "./readRepository";
import { PRUNE_THRESHOLD } from "./readState";
import type { NotificationView } from "./types";

const READ_STATE_ERROR = "Read status could not be loaded.";
const SAVE_ERROR = "Could not save that as read. Check your connection and try again.";

interface NotificationsValue {
  role: OrderRole;
  items: NotificationView[];
  unreadCount: number; // 0 until everything has loaded, so the badge never flashes a wrong number
  ready: boolean;
  readStateError: boolean; // the read list could not be loaded, so everything shows as unread
  saveError: string;
  markRead: (keys: string[]) => void;
  markAllRead: () => void;
}

const NotificationsContext = createContext<NotificationsValue | null>(null);

/**
 * The notification bell's data: what needs this role's attention (derived from alerts and orders) plus
 * which of it this user has already read (stored in Firestore, so it survives a refresh and follows the
 * user between devices). Also puts the unread count in the browser tab title.
 */
export function NotificationsProvider({ uid, role, children }: { uid: string; role: OrderRole; children: ReactNode }) {
  const { alerts, loading: alertsLoading } = useAlerts();
  const { orders, loading: ordersLoading } = useOrders();
  const subscribe = useCallback<Subscribe<string[]>>((onData, onError) => subscribeReadKeys(uid, onData, onError), [uid]);
  const read = useSubscription(subscribe, READ_STATE_ERROR);
  const [saveError, setSaveError] = useState("");
  const pruning = useRef(false);

  const derived = useMemo(() => deriveNotifications(role, alerts, orders), [role, alerts, orders]);
  const readStateError = Boolean(read.error);
  const readSet = useMemo(() => new Set(read.data ?? []), [read.data]);
  const items = useMemo(
    () => sortNotifications(derived.map((n) => ({ ...n, unread: readStateError || !readSet.has(n.key) }))),
    [derived, readStateError, readSet],
  );
  const ready = !alertsLoading && !ordersLoading && !read.loading;
  const unreadCount = ready ? items.filter((n) => n.unread).length : 0;

  useTitleCount(unreadCount, true);

  // Keep the read list from growing for ever: forget keys whose notifications are long gone.
  useEffect(() => {
    if (!read.data || read.data.length <= PRUNE_THRESHOLD || pruning.current) return;
    pruning.current = true;
    pruneReadKeys(uid, new Set(derived.map((n) => n.key)))
      .catch((error) => console.error("Could not tidy the read list", error))
      .finally(() => {
        pruning.current = false;
      });
  }, [read.data, derived, uid]);

  const markRead = useCallback(
    (keys: string[]) => {
      if (readStateError) return; // nothing can be saved while the read list is unavailable
      const unread = items.filter((n) => n.unread && keys.includes(n.key)).map((n) => n.key);
      if (unread.length === 0) return;
      setSaveError("");
      markKeysRead(uid, unread).catch((error) => {
        console.error("Could not mark notifications as read", error);
        setSaveError(SAVE_ERROR);
      });
    },
    [items, readStateError, uid],
  );

  const markAllRead = useCallback(() => markRead(items.filter((n) => n.unread).map((n) => n.key)), [items, markRead]);

  const value = useMemo(
    () => ({ role, items, unreadCount, ready, readStateError, saveError, markRead, markAllRead }),
    [role, items, unreadCount, ready, readStateError, saveError, markRead, markAllRead],
  );
  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNotifications(): NotificationsValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used inside <NotificationsProvider>");
  return ctx;
}
