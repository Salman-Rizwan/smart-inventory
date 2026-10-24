import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import { logout } from "../features/auth/authService";
import Button from "../shared/components/Button";
import Logo from "../shared/components/Logo";
import Notification from "../shared/components/Notification";

export default function AppShell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
    <>
      <a className="skip-link" href="#main">Skip to Main Content</a>
      <header className="app-header">
        <div className="app-header__inner">
          <NavLink to="/dashboard" className="brand" aria-label="Smart Inventory home">
            <Logo />
            <span className="brand__name" translate="no">Smart Inventory</span>
          </NavLink>
          <nav className="app-nav" aria-label="Primary">
            <NavLink to="/dashboard">Dashboard</NavLink>
          </nav>
          <div className="app-user">
            <span className="app-user__email" title={user.email}>{user.email}</span>
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
    </>
  );
}
