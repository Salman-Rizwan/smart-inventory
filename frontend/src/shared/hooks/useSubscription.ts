import { useEffect, useState } from "react";

type Unsubscribe = () => void;
export type Subscribe<T> = (onData: (data: T) => void, onError: (error: unknown) => void) => Unsubscribe;

export interface SubscriptionState<T> {
  data: T | undefined;
  error: string;
  loading: boolean;
}

/** Subscribes to a live data source. `subscribe` must be a stable reference (module level or useCallback). */
export function useSubscription<T>(subscribe: Subscribe<T>, errorMessage: string): SubscriptionState<T> {
  const [state, setState] = useState<{ data: T | undefined; error: string }>({ data: undefined, error: "" });

  useEffect(
    () =>
      subscribe(
        (data) => setState({ data, error: "" }),
        (err) => {
          console.error("Live listener failed", err);
          setState({ data: undefined, error: errorMessage });
        },
      ),
    [subscribe, errorMessage],
  );

  return { data: state.data, error: state.error, loading: state.data === undefined && !state.error };
}
