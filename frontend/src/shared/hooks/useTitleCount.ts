import { useEffect } from "react";

const APP_TITLE = "Smart Inventory";

/** Shows a count in the browser tab title, like "(2) Smart Inventory", even when another window is in front. */
export function useTitleCount(count: number, enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return undefined;
    document.title = count > 0 ? `(${count}) ${APP_TITLE}` : APP_TITLE;
    return () => {
      document.title = APP_TITLE;
    };
  }, [count, enabled]);
}
