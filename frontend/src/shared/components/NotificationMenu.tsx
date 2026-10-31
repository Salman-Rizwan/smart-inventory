import IconButton from "@mui/material/IconButton";
import { styled } from "@mui/material/styles";
import { useEffect, useId, useRef, useState } from "react";
import { formatDateTime } from "../format";
import { breakpoint, color, font, layout, space, text } from "../theme/tokens";
import Button from "./Button";
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

const narrow = `@media (max-width: ${breakpoint.narrow})`;

const Root = styled("div")({ position: "relative", [narrow]: { position: "static" } });

/** Unread count on the bell. */
const CountBadge = styled("span")({
  position: "absolute",
  top: 2,
  right: 0,
  minWidth: 18,
  padding: "0 4px",
  fontFamily: font.mono,
  fontSize: text.xs,
  fontWeight: 600,
  lineHeight: "18px",
  textAlign: "center",
  color: color.onAccent,
  background: color.error,
});

/** The dropdown: under the bell on wide screens, full width under the header on phones. */
const Panel = styled("div")({
  position: "absolute",
  top: `calc(100% + ${space(2)})`,
  right: 0,
  zIndex: 20,
  width: `min(380px, calc(100vw - 2 * ${space(4)}))`,
  maxHeight: "70vh",
  overflowY: "auto",
  overscrollBehavior: "contain",
  background: color.canvas,
  border: `1px solid ${color.borderStrong}`,
  // The one raised surface in the app: it floats over the page, so it needs to read as on top.
  boxShadow: "0 6px 16px rgb(0 0 0 / 16%)",
  [narrow]: {
    position: "fixed",
    top: `calc(${layout.headerHeight} + ${space(2)})`,
    left: space(4),
    right: space(4),
    width: "auto",
  },
});

const Header = styled("div")({
  display: "flex",
  alignItems: "baseline",
  justifyContent: "space-between",
  gap: space(3),
  padding: `${space(3)} ${space(4)}`,
  background: color.surface,
  borderBottom: `1px solid ${color.border}`,
});

const Title = styled("h2")({ fontSize: text.md, fontWeight: 600 });
const NewCount = styled("span")({ fontSize: text.sm, fontWeight: 600, color: color.info });
const NoticeBox = styled("div")({ padding: `${space(3)} ${space(4)}`, borderBottom: `1px solid ${color.border}` });

const Empty = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: space(3),
  padding: `${space(6)} ${space(4)}`,
  color: color.inkMuted,
  textAlign: "center",
});

const List = styled("ul")({ margin: 0, padding: 0, listStyle: "none" });

/** One notification: unread ones sit on the info tint. */
const Item = styled("button", { shouldForwardProp: (prop) => prop !== "unread" })<{ unread: boolean }>(({ unread }) => ({
  display: "grid",
  gap: 2,
  width: "100%",
  padding: `${space(3)} ${space(4)}`,
  border: 0,
  borderBottom: `1px solid ${color.border}`,
  background: unread ? color.infoBg : color.canvas,
  color: color.ink,
  font: "inherit",
  textAlign: "left",
  cursor: "pointer",
  touchAction: "manipulation",
  "&:hover": { background: color.surfaceStrong },
  "&:focus-visible": { outlineOffset: "-2px" },
}));

/** Bold when unread; read ones are greyed. */
const ItemTitle = styled("span", { shouldForwardProp: (prop) => prop !== "unread" })<{ unread: boolean }>(({ unread }) => ({
  fontSize: text.sm,
  fontWeight: unread ? 600 : 400,
  color: unread ? undefined : color.inkMuted,
}));

const Dot = styled("span")({ display: "inline-block", width: 8, height: 8, marginRight: space(2), background: color.accent });
const ItemDetail = styled("span")({ fontSize: text.sm, color: color.inkMuted });
const ItemTime = styled("time")({ fontSize: text.xs, color: color.inkMuted, fontFamily: font.mono, fontVariantNumeric: "tabular-nums" });

const Footer = styled("div")({
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "space-between",
  gap: `${space(2)} ${space(3)}`,
  padding: `${space(2)} ${space(4)}`,
  fontSize: text.sm,
});

const Actions = styled("div")({ display: "flex", flexWrap: "wrap", gap: space(1), marginLeft: "auto" });

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
    <Root ref={rootRef}>
      <IconButton
        ref={bellRef}
        aria-label={label}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={toggle}
        sx={{ width: 40, height: 40, color: "text.primary", "@media (pointer: coarse)": { width: 44, height: 44 } }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false">
          <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
        {count > 0 && (
          <CountBadge aria-hidden="true">{count > 9 ? "9+" : count}</CountBadge>
        )}
      </IconButton>

      {open && (
        <Panel id={panelId} role="region" aria-labelledby={`${panelId}-title`}>
          <Header>
            <Title id={`${panelId}-title`}>Notifications</Title>
            {count > 0 && <NewCount>{`${count} new`}</NewCount>}
          </Header>

          <p className="visually-hidden" role="status" aria-live="polite">
            {status}
          </p>

          {notice && (
            <NoticeBox>
              <Notification kind="warning">{notice}</Notification>
            </NoticeBox>
          )}

          {shown.length === 0 ? (
            <Empty>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
                <path d="M6 9a6 6 0 0 1 9.5-4.9M18 9c0 5 2 6 2 6H8" />
                <path d="M10 19a2 2 0 0 0 4 0M3 3l18 18" />
              </svg>
              <p>{emptyText}</p>
            </Empty>
          ) : (
            <>
              <List>
                {shown.map((item) => (
                  <li key={item.id}>
                    <Item type="button" unread={item.unread} onClick={() => choose(item.onSelect)}>
                      <ItemTitle unread={item.unread}>
                        {item.unread && (
                          <>
                            <Dot aria-hidden="true" />
                            <span className="visually-hidden">Unread:</span>{" "}
                          </>
                        )}
                        {item.title}
                      </ItemTitle>{" "}
                      <ItemDetail>{item.detail}</ItemDetail>{" "}
                      {item.time && <ItemTime dateTime={item.time.toISOString()}>{formatDateTime(item.time)}</ItemTime>}
                    </Item>
                  </li>
                ))}
              </List>
              <Footer>
                {items.length > shown.length && <span className="muted">{`Showing ${shown.length} of ${items.length}`}</span>}
                <Actions>
                  <Button variant="ghost" size="small" onClick={markAll} disabled={count === 0}>
                    Mark All as Read
                  </Button>
                  <Button variant="ghost" size="small" onClick={() => choose(viewAll.onSelect)}>
                    {viewAll.label}
                  </Button>
                </Actions>
              </Footer>
            </>
          )}
        </Panel>
      )}
    </Root>
  );
}
