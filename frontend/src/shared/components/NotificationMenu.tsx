import { useEffect, useId, useRef, useState } from "react";
import { formatDateTime } from "../format";
import Notification from "./Notification";

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  time: Date | null;
  unread: boolean;
  onSelect: () => void;
}

interface Props {
  label: string; // accessible name of the bell, including the unread count in words
  count: number; // unread count: the badge number
  items: NotificationItem[]; // unread first; only the first few are listed
  emptyText: string;
  viewAll: { label: string; onSelect: () => void };
  onMarkAllRead: () => void;
  notice?: string; // shown above the list, e.g. when read status is unavailable
}

const MAX_ITEMS = 5;

/**
 * Header bell with a dropdown of what needs attention. A disclosure, not a menu: Tab moves through
 * the items, Escape closes and returns focus to the bell, and clicking or tabbing away closes it.
 * Unread items are bold with a dot (and announced as "Unread"); read ones are greyed.
 */
export default function NotificationMenu({ label, count, items, emptyText, viewAll, onMarkAllRead, notice }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const bellRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const shown = items.slice(0, MAX_ITEMS);

  useEffect(() => {
    if (!open) return undefined;
    const outside = (target: EventTarget | null) => !rootRef.current?.contains(target as Node | null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      bellRef.current?.focus();
    };
    const onPointer = (event: PointerEvent) => outside(event.target) && setOpen(false);
    const onFocus = (event: FocusEvent) => outside(event.target) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("focusin", onFocus);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("focusin", onFocus);
    };
  }, [open]);

  const toggle = () => {
    setStatus("");
    setOpen((v) => !v);
  };

  const choose = (action: () => void) => {
    setOpen(false);
    action();
  };

  const markAll = () => {
    onMarkAllRead();
    setStatus("All notifications marked as read.");
  };

  return (
    <div className="notify" ref={rootRef}>
      <button
        ref={bellRef}
        type="button"
        className="icon-btn"
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 && (
          <span className="icon-btn__badge" aria-hidden="true">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div id={panelId} className="notify__panel" role="region" aria-labelledby={`${panelId}-title`}>
          <div className="notify__header">
            <h2 id={`${panelId}-title`} className="notify__title">
              Notifications
            </h2>
            {count > 0 && <span className="notify__new">{`${count} new`}</span>}
          </div>

          <p className="visually-hidden" role="status" aria-live="polite">
            {status}
          </p>

          {notice && (
            <div className="notify__notice">
              <Notification kind="warning">{notice}</Notification>
            </div>
          )}

          {shown.length === 0 ? (
            <div className="notify__empty">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                <path d="M6 9a6 6 0 0 1 9.5-4.9M18 9c0 5 2 6 2 6H8" />
                <path d="M10 19a2 2 0 0 0 4 0M3 3l18 18" />
              </svg>
              <p>{emptyText}</p>
            </div>
          ) : (
            <>
              <ul className="notify__list">
                {shown.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      className={item.unread ? "notify__item notify__item--unread" : "notify__item"}
                      onClick={() => choose(item.onSelect)}
                    >
                      <span className="notify__item-title">
                        {item.unread && (
                          <>
                            <span className="notify__dot" aria-hidden="true" />
                            <span className="visually-hidden">Unread:</span>{" "}
                          </>
                        )}
                        {item.title}
                      </span>{" "}
                      <span className="notify__item-detail">{item.detail}</span>{" "}
                      {item.time && (
                        <time className="notify__item-time mono" dateTime={item.time.toISOString()}>
                          {formatDateTime(item.time)}
                        </time>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
              <div className="notify__footer">
                {items.length > shown.length && <span className="muted">{`Showing ${shown.length} of ${items.length}`}</span>}
                <div className="notify__actions">
                  <button type="button" className="btn btn--ghost btn--sm" onClick={markAll} disabled={count === 0}>
                    Mark All as Read
                  </button>
                  <button type="button" className="btn btn--ghost btn--sm" onClick={() => choose(viewAll.onSelect)}>
                    {viewAll.label}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
