import { useEffect } from "react";

const APP_TITLE = "Smart Inventory";

/** "(2) Alerts · Smart Inventory": the unread count first, so it shows even in a narrow browser tab. */
export function documentTitle(page?: string, count = 0): string {
  const name = page ? `${page} · ${APP_TITLE}` : APP_TITLE;
  return count > 0 ? `(${count}) ${name}` : name;
}

/** Sets the browser tab title, even when another window is in front, and restores the plain name on unmount. */
export function useDocumentTitle(page?: string, count = 0): void {
  useEffect(() => {
    document.title = documentTitle(page, count);
    return () => {
      document.title = APP_TITLE;
    };
  }, [page, count]);
}
