import { createContext, useContext, useMemo, type ReactNode } from "react";
import { useSubscription, type Subscribe } from "../../shared/hooks/useSubscription";
import { useTitleCount } from "../../shared/hooks/useTitleCount";
import { subscribeOrders } from "./orderRepository";
import { countByState } from "./orderWorkflow";
import type { Order } from "./types";

const LOAD_ERROR = "Orders could not be loaded. Check your connection and sign in again if this continues.";

interface OrdersValue {
  enabled: boolean;
  orders: Order[];
  pendingCount: number;
  loading: boolean;
  error: string;
}

const OrdersContext = createContext<OrdersValue | null>(null);
const subscribeNone: Subscribe<Order[]> = () => () => {};

/**
 * One live orders listener shared by the header bell and the orders page. Roles that do not see
 * orders (the shopkeeper, for now) pass enabled={false} and never subscribe.
 */
export function OrdersProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const { data, error, loading } = useSubscription(enabled ? subscribeOrders : subscribeNone, LOAD_ERROR);
  const orders = useMemo(() => data ?? [], [data]);
  const pendingCount = countByState(orders).Pending;

  useTitleCount(pendingCount, enabled);

  const value = useMemo(
    () => ({ enabled, orders, pendingCount, loading: enabled && loading, error }),
    [enabled, orders, pendingCount, loading, error],
  );
  return <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useOrders(): OrdersValue {
  const ctx = useContext(OrdersContext);
  if (!ctx) throw new Error("useOrders must be used inside <OrdersProvider>");
  return ctx;
}
