const ICONS = { error: "!", warning: "!", success: "✓", info: "i" };
const LABELS = { error: "Error", warning: "Warning", success: "Success", info: "Note" };

/**
 * Inline message. Errors use role="alert"; everything else is a polite status.
 * Pass announce={false} when the message is rendered inside an existing aria-live region.
 */
export default function Notification({ kind = "info", announce = true, children }) {
  const role = !announce ? undefined : kind === "error" ? "alert" : "status";
  return (
    <div className={`notification notification--${kind}`} role={role}>
      <span className="notification__icon" aria-hidden="true">{ICONS[kind]}</span>
      <p className="notification__text">
        <span className="visually-hidden">{LABELS[kind]}: </span>
        {children}
      </p>
    </div>
  );
}
