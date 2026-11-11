import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AlertsProvider, useAlerts } from "../features/alerts/AlertsContext";
import { useAuth } from "../features/auth/AuthContext";
import { logout } from "../features/auth/authService";
import { pageLabel, ROLES } from "../features/auth/roles";
import NotificationBell from "../features/notifications/NotificationBell";
import { NotificationsProvider } from "../features/notifications/NotificationsContext";
import { OrdersProvider, useOrders } from "../features/orders/OrdersContext";
import { InsightsProvider } from "../features/insights/InsightsContext";
import { ProductsProvider } from "../features/inventory/ProductsContext";
import Avatar from "../shared/components/Avatar";
import Button from "../shared/components/Button";
import Logo from "../shared/components/Logo";
import Notification from "../shared/components/Notification";
import { breakpoint, color, layout, text } from "../shared/theme/tokens";
import PrimaryNav from "./PrimaryNav";

const narrow = `@media (max-width: ${breakpoint.narrow})`;
const tabsRow = `@media (max-width: ${breakpoint.tabsRow})`;

const Brand = styled(NavLink)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: color.ink,
  textDecoration: "none",
  fontWeight: 600,
  "&:hover": { color: color.ink },
});

/** Visually hidden until focused, then shown at the top left. */
const SkipLink = styled("a")({
  position: "absolute",
  left: 8,
  top: -100,
  zIndex: 100,
  padding: "8px 16px",
  background: color.ink,
  color: color.canvas,
  "&:focus": { top: 8 },
});

function NavWithCounts({ items }) {
  const { attentionCount } = useOrders();
  const { openCount } = useAlerts();
  return <PrimaryNav items={items} counts={{ alerts: openCount, orders: attentionCount }} />;
}

export default function AppShell() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const role = ROLES[profile.role];

  async function handleLogout() {
    setBusy(true);
    setError("");
    try {
      await logout();
      navigate("/login", { replace: true });
    } catch {
      setError("Could not log out. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <ProductsProvider enabled={role.stock}>
      <InsightsProvider enabled={role.insights}>
      <AlertsProvider enabled={role.alerts}>
        <OrdersProvider enabled={role.orders} role={profile.role}>
          <NotificationsProvider uid={user.uid} role={profile.role} page={pageLabel(role.nav, pathname)}>
            <SkipLink href="#main">Skip to Main Content</SkipLink>
            <Box
              component="header"
              sx={{ position: "sticky", top: 0, zIndex: 10, background: color.canvas, borderBottom: `1px solid ${color.border}` }}
            >
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  maxWidth: layout.contentMax,
                  minHeight: layout.headerHeight,
                  mx: "auto",
                  px: 4,
                  // Narrower than a laptop, the tabs wrap onto a full-width second row (PrimaryNav), so four tabs with counts fit even at 320 px.
                  [tabsRow]: { flexWrap: "wrap", rowGap: 0 },
                  [narrow]: { columnGap: 1, px: 2 },
                }}
              >
                <Brand to={role.home} aria-label="Smart Inventory home">
                  <Logo />
                  <Box component="span" translate="no" sx={{ [narrow]: { display: "none" } }}>
                    Smart Inventory
                  </Box>
                </Brand>
                <NavWithCounts items={role.nav} />
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 3,
                    minHeight: layout.headerHeight,
                    fontSize: text.sm,
                    [tabsRow]: { ml: "auto" },
                    [narrow]: { gap: 2, "& .MuiButton-root": { px: 2, whiteSpace: "nowrap" } },
                  }}
                >
                  <NotificationBell />
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      lineHeight: 1.3,
                      minWidth: 0,
                      [narrow]: { display: "none" },
                    }}
                  >
                    <Box
                      component="span"
                      sx={{ maxWidth: "20ch", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600 }}
                    >
                      {profile.name}
                    </Box>
                    <Box component="span" sx={{ color: color.inkMuted, fontSize: text.xs }}>
                      {role.label}
                    </Box>
                  </Box>
                  <Box component="span" sx={{ display: "inline-flex" }}>
                    <Avatar name={profile.name} />
                  </Box>
                  <Button variant="ghost" onClick={handleLogout} loading={busy} loadingLabel="Logging out…">
                    Log Out
                  </Button>
                </Box>
              </Box>
            </Box>
            <Box
              component="main"
              id="main"
              tabIndex={-1}
              sx={{
                maxWidth: layout.contentMax,
                mx: "auto",
                pt: 6,
                px: 4,
                pb: 12,
                scrollMarginTop: layout.headerHeight,
                [tabsRow]: { scrollMarginTop: layout.headerHeightNarrow },
              }}
            >
              {error && <Notification kind="error">{error}</Notification>}
              <Outlet />
            </Box>
          </NotificationsProvider>
        </OrdersProvider>
      </AlertsProvider>
      </InsightsProvider>
    </ProductsProvider>
  );
}
