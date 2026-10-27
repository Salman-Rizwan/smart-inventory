import { useNavigate } from "react-router-dom";
import { useAlerts } from "./AlertsContext";

/** Header bell with the open-alert count. Jumps to the alerts panel and moves focus there. */
export default function AlertBell() {
  const { openCount } = useAlerts();
  const navigate = useNavigate();

  function handleClick() {
    const heading = document.getElementById("alerts-title");
    if (!heading) {
      navigate("/dashboard");
      return;
    }
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    heading.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
    heading.focus({ preventScroll: true });
  }

  const label =
    openCount === 0 ? "No open alerts" : `${openCount} open ${openCount === 1 ? "alert" : "alerts"}. Go to alerts`;

  return (
    <button type="button" className="icon-btn" onClick={handleClick} aria-label={label}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
        <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
        <path d="M10 19a2 2 0 0 0 4 0" />
      </svg>
      {openCount > 0 && (
        <span className="icon-btn__badge" aria-hidden="true">
          {openCount > 9 ? "9+" : openCount}
        </span>
      )}
    </button>
  );
}
