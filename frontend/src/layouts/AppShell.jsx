import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import AlertBell from "../features/alerts/AlertBell";
import { AlertsProvider } from "../features/alerts/AlertsContext";
import { useAuth } from "../features/auth/AuthContext";
import { logout } from "../features/auth/authService";
import { ROLES } from "../features/auth/roles";
import OrderBell from "../features/orders/OrderBell";
import { OrdersProvider, useOrders } from "../features/orders/OrdersContext";
import Avatar from "../shared/components/Avatar";
import Button from "../shared/components/Button";
import Logo from "../shared/components/Logo";
import Notification from "../shared/components/Notification";

/** Primary navigation. An item can carry a count of orders waiting for this role to act. */
function PrimaryNav({ items }) {
  const { attentionCount } = useOrders();
  return (
    <nav className="app-nav" aria-label="Primary">
      {items.map((item) => (
        <NavLink key={item.to} to={item.to}>
          {item.label}
          {item.badge === "orders" && attentionCount > 0 && (
            <>
              <span className="nav-badge" aria-hidden="true">{attentionCount}</span>
              <span className="visually-hidden">, {attentionCount} need your action</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

export default function AppShell() {
  const { profile } = useAuth();
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
        <a className="skip-link" href="#main">Skip to Main Content</a>
        <header className="app-header">
          <div className="app-header__inner">
            <NavLink to={role.home} className="brand" aria-label="Smart Inventory home">
              <Logo />
              <span className="brand__name" translate="no">Smart Inventory</span>
            </NavLink>
            <PrimaryNav items={role.nav} />
            <div className="app-user">
              {role.alerts && <AlertBell />}
              {role.orderBell && <OrderBell />}
              <div className="app-user__identity">
                <span className="app-user__name">{profile.name}</span>
                <span className="app-user__role">{role.label}</span>
              </div>
              <Avatar name={profile.name} />
              <Button variant="ghost" onClick={handleLogout} loading={busy} loadingLabel="Logging out…">
                Log Out
              </Button>
            </div>
          </div>
        </header>
        <main id="main" className="app-main" tabIndex={-1}>
          {error && <Notification kind="error">{error}</Notification>}
          <Outlet />
        </main>
      </OrdersProvider>
    </AlertsProvider>
  );
}
