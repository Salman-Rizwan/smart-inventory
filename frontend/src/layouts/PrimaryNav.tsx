import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";
import { NavLink } from "react-router-dom";
import { breakpoint, color, font, layout, text } from "../shared/theme/tokens";

export interface NavItem {
  to: string;
  label: string;
  badge?: "orders";
}

const narrow = `@media (max-width: ${breakpoint.narrow})`;

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
  [narrow]: { padding: "0 8px" },
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

/** Primary navigation. An item can carry a count of orders waiting for this role to act. */
export default function PrimaryNav({ items, attentionCount }: { items: NavItem[]; attentionCount: number }) {
  return (
    <Box
      component="nav"
      aria-label="Primary"
      sx={{
        display: "flex",
        gap: 1,
        flex: 1,
        // Scrolls rather than widening the page if a role has more tabs than fit.
        [narrow]: { gap: 0, minWidth: 0, overflowX: "auto" },
      }}
    >
      {items.map((item) => (
        <Tab key={item.to} to={item.to}>
          {item.label}
          {item.badge === "orders" && attentionCount > 0 && (
            <>
              <CountBadge aria-hidden="true">{attentionCount}</CountBadge>
              <span className="visually-hidden">, {attentionCount} need your action</span>
            </>
          )}
        </Tab>
      ))}
    </Box>
  );
}
