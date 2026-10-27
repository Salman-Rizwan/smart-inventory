import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSubscription, type Subscribe } from "../../shared/hooks/useSubscription";
import { subscribeOrders } from "./orderRepository";
import { attentionState, countByState } from "./orderWorkflow";
import type { Order, OrderRole } from "./types";

const LOAD_ERROR = "Orders could not be loaded. Check your connection and sign in again if this continues.";

interface OrdersValue {
  enabled: boolean;
  role: OrderRole;
  orders: Order[];
  pendingCount: number; // orders waiting for the dealer to accept
  attentionCount: number; // orders waiting for this role to act (dealer: Pending, shopkeeper: Dispatched)
  loading: boolean;
  error: string;
}

const OrdersContext = createContext<OrdersValue | null>(null);
const subscribeNone: Subscribe<Order[]> = () => () => {};

/**
 * One live orders listener shared by the header bell, the nav badge and the orders page. Roles that do
 * not see orders pass enabled={false} and never subscribe. The tab title is owned by the notifications
 * provider, which shows the unread count.
 */
export function OrdersProvider({ enabled, role, children }: { enabled: boolean; role: OrderRole; children: ReactNode }) {
  const { data, error, loading } = useSubscription(enabled ? subscribeOrders : subscribeNone, LOAD_ERROR);
  const orders = useMemo(() => data ?? [], [data]);
  const counts = countByState(orders);
  const pendingCount = counts.Pending;
  const attentionCount = counts[attentionState(role)];

  const value = useMemo(
    () => ({ enabled, role, orders, pendingCount, attentionCount, loading: enabled && loading, error }),
    [enabled, role, orders, pendingCount, attentionCount, loading, error],
  );
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrders(): OrdersValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used inside <OrdersProvider>");
  return ctx;
}
