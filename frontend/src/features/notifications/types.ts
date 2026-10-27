import type { OrderState } from "../orders/types";

/** What a notification is about, so selecting it can take the user there. */
export type NotificationTarget = { kind: "alert"; id: string } | { kind: "order"; id: string; state: OrderState };

export interface AppNotification {
  key: string; // stable id used to remember that it was read
  title: string;
  detail: string;
  time: Date | null;
  target: NotificationTarget;
}

export interface NotificationView extends AppNotification {
  unread: boolean;
}
