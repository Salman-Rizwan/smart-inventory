import Box from "@mui/material/Box";
import { useState } from "react";
import Button from "../../shared/components/Button";
import CardPage, { CardBrand } from "../../shared/components/CardPage";
import Notification from "../../shared/components/Notification";
import { space } from "../../shared/theme/tokens";
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
    <CardPage>
      <CardBrand />
      <h1>Account Not Ready</h1>
      <Box sx={{ display: "flex", flexDirection: "column", gap: space(4), marginTop: space(4) }}>
        <Notification kind={failed ? "error" : "warning"}>
          {failed
            ? "Your profile could not be loaded. Check your connection and sign in again."
            : "Your account has no role yet. Ask your administrator to assign one, then sign in again."}
        </Notification>
        <Button variant="secondary" onClick={handleLogout} loading={busy} loadingLabel="Signing out…">
          Sign Out
        </Button>
      </Box>
    </CardPage>
  );
}
