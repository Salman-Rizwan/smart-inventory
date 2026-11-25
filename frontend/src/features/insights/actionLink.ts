import type { Action } from "./analytics";

/** Where an action leads, when there is somewhere to act on it. */
export function actionLink(action: Action, part: string): { to: string; label: string } | null {
  switch (action.kind) {
    case "waiting":
    case "due":
      return { to: "/orders", label: "View Orders" };
    case "adjust":
      return { to: `/products?part=${encodeURIComponent(part)}`, label: "Edit in Part Settings" };
    default:
      return null;
  }
}
