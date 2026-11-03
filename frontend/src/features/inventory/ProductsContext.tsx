import { createContext, useContext, type ReactNode } from "react";
import { useSubscription, type Subscribe, type SubscriptionState } from "../../shared/hooks/useSubscription";
import { subscribeProducts } from "./productRepository";
import type { Product } from "./types";

const LOAD_ERROR = "Stock records could not be loaded. Check your connection and sign in again if this continues.";

const ProductsContext = createContext<SubscriptionState<Product[]> | null>(null);
const subscribeNone: Subscribe<Product[]> = () => () => {};

/**
 * One live products listener shared by Stock Check and Part Settings (and later the Stock Log and
 * Insights). Roles that do not see stock (the dealer) pass enabled={false} and never subscribe.
 */
export function ProductsProvider({ enabled, children }: { enabled: boolean; children: ReactNode }) {
  const state = useSubscription(enabled ? subscribeProducts : subscribeNone, LOAD_ERROR);
  return <ProductsContext.Provider value={state}>{children}</ProductsContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useProductsContext(): SubscriptionState<Product[]> {
  const ctx = useContext(ProductsContext);
  if (!ctx) throw new Error("useProducts must be used inside <ProductsProvider>");
  return ctx;
}
