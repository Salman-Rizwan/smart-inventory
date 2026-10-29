import Alert from "@mui/material/Alert";
import type { ReactNode } from "react";

type Kind = "error" | "warning" | "success" | "info";

const ICONS: Record<Kind, string> = { error: "!", warning: "!", success: "✓", info: "i" };
const LABELS: Record<Kind, string> = { error: "Error", warning: "Warning", success: "Success", info: "Note" };

interface NotificationProps {
  kind?: Kind;
  /** False when the message is rendered inside an existing aria-live region. */
  announce?: boolean;
  children: ReactNode;
}

/**
 * Inline message. Errors use role="alert"; everything else is a polite status.
 * Pass announce={false} when the message is rendered inside an existing aria-live region.
 */
export default function Notification({ kind = "info", announce = true, children }: NotificationProps) {
  const role = !announce ? "none" : kind === "error" ? "alert" : "status";
  return (
    <Alert severity={kind} role={role} icon={<span aria-hidden="true">{ICONS[kind]}</span>}>
      <p>
        <span className="visually-hidden">{LABELS[kind]}: </span>
        {children}
      </p>
    </Alert>
  );
}
