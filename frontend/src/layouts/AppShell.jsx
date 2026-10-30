import Box from "@mui/material/Box";
import { styled } from "@mui/material/styles";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { AlertsProvider } from "../features/alerts/AlertsContext";
import { useAuth } from "../features/auth/AuthContext";
import { logout } from "../features/auth/authService";
import { ROLES } from "../features/auth/roles";
import NotificationBell from "../features/notifications/NotificationBell";
import { NotificationsProvider } from "../features/notifications/NotificationsContext";
import { OrdersProvider, useOrders } from "../features/orders/OrdersContext";
import Avatar from "../shared/components/Avatar";
import Button from "../shared/components/Button";
import Logo from "../shared/components/Logo";
import Notification from "../shared/components/Notification";
import { breakpoint, color, layout, text } from "../shared/theme/tokens";
import PrimaryNav from "./PrimaryNav";

const narrow = `@media (max-width: ${breakpoint.narrow})`;

const Brand = styled(NavLink)({
  display: "flex",
  alignItems: "center",
  gap: 12,
  color: color.ink,
  textDecoration: "none",
  fontWeight: 600,
  "&:hover": { color: color.ink },
  [`@media (max-width: ${breakpoint.brandHidden})`]: { display: "none" },
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
  return <PrimaryNav items={items} attentionCount={attentionCount} />;
}

export default function AppShell() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
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
    <AlertsProvider enabled={role.alerts}>
      <OrdersProvider enabled={role.orders} role={profile.role}>
        <NotificationsProvider uid={user.uid} role={profile.role}>
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
                [narrow]: { gap: 1, px: 2 },
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
                  fontSize: text.sm,
                  [narrow]: { gap: 1, "& .MuiButton-root": { px: 2, whiteSpace: "nowrap" } },
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
                <Box
                  component="span"
                  sx={{ display: "inline-flex", [`@media (max-width: ${breakpoint.avatarHidden})`]: { display: "none" } }}
                >
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
            }}
          >
            {error && <Notification kind="error">{error}</Notification>}
            <Outlet />
          </Box>
        </NotificationsProvider>
      </OrdersProvider>
    </AlertsProvider>
  );
}
