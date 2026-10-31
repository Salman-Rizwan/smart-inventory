import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";
import { NavLink } from "react-router-dom";
import { VisuallyHidden } from "../shared/components/text";
import { breakpoint, color, font, layout, text } from "../shared/theme/tokens";

export interface NavItem {
  to: string;
  label: string;
  badge?: NavBadge;
}

/** Which count a tab shows: open alerts, or orders waiting for this role to act. */
export type NavBadge = "alerts" | "orders";

/** How each count reads to a screen reader, after the tab name. */
const SPOKEN: Record<NavBadge, (n: number) => string> = {
  alerts: (n) => `, ${n} open`,
  orders: (n) => `, ${n} need your action`,
};

const narrow = `@media (max-width: ${breakpoint.narrow})`;
const tabsRow = `@media (max-width: ${breakpoint.tabsRow})`;

/** A tab in the header. Real links (NavLink sets aria-current="page" on the current one). */
const Tab = styled(NavLink)({
  display: "flex",
  alignItems: "center",
  minHeight: layout.headerHeight,
  padding: "0 16px",
  color: color.inkMuted,
  textDecoration: "none",
  fontSize: text.sm,
  whiteSpace: "nowrap",
  borderBottom: "3px solid transparent",
  "&:hover": { background: color.surface, color: color.ink },
  '&[aria-current="page"]': { color: color.ink, fontWeight: 600, borderBottomColor: color.accent },
  // The nav can scroll, which clips anything outside it, so the focus ring is drawn inside the tab.
  "&:focus-visible": { outlineOffset: "-2px" },
  // On the second row: tabs share the row, each at least as wide as its label.
  [tabsRow]: { flex: "1 0 auto", justifyContent: "center", minHeight: layout.navRowHeight },
  [narrow]: { padding: "0 10px" },
});

const CountBadge = styled("span")({
  marginLeft: 8,
  minWidth: 20,
  padding: "0 5px",
  fontFamily: font.mono,
  fontSize: text.xs,
  fontWeight: 600,
  lineHeight: "20px",
  textAlign: "center",
  color: color.warning,
  background: color.warningBg,
});

/** Primary navigation. An item can carry a count of work waiting on that page. */
export default function PrimaryNav({ items, counts }: { items: NavItem[]; counts: Record<NavBadge, number> }) {
  return (
    <Box
      component="nav"
      aria-label="Primary"
      sx={{
        display: "flex",
        gap: 1,
        flex: 1,
        // Scrolls rather than widening the page if a role ever has more tabs than fit.
        minWidth: 0,
        overflowX: "auto",
        // Narrower than a laptop: a full-width second row under the logo, bell and Log Out.
        [tabsRow]: { order: 1, flexBasis: "100%", mx: -4, borderTop: `1px solid ${color.border}` },
        [narrow]: { gap: 0, mx: -2 },
      }}
    >
      {items.map((item) => {
        const count = item.badge ? counts[item.badge] : 0;
        return (
          <Tab key={item.to} to={item.to}>
            {item.label}
            {item.badge && count > 0 && (
              <>
                <CountBadge aria-hidden="true">{count}</CountBadge>
                <VisuallyHidden>{SPOKEN[item.badge](count)}</VisuallyHidden>
              </>
            )}
          </Tab>
        );
      })}
    </Box>
  );
}
