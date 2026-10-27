import { useState } from "react";
import Button from "../../shared/components/Button";
import Logo from "../../shared/components/Logo";
import Notification from "../../shared/components/Notification";
import { logout } from "./authService";

/** Shown when someone is signed in but has no usable profile (no role, or the profile failed to load). */
export default function AccountProblem({ failed }) {
  const [busy, setBusy] = useState(false);

  async function handleLogout() {
    setBusy(true);
    try {
      await logout();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="panel auth-card">
        <div className="panel__body">
          <div className="auth-card__brand">
            <Logo />
            <span translate="no">Smart Inventory</span>
          </div>
          <h1>Account Not Ready</h1>
          <div className="stack">
            <Notification kind={failed ? "error" : "warning"}>
              {failed
                ? "Your profile could not be loaded. Check your connection and sign in again."
                : "Your account has no role yet. Ask your administrator to assign one, then sign in again."}
            </Notification>
            <Button variant="secondary" onClick={handleLogout} loading={busy} loadingLabel="Signing out…">
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}
