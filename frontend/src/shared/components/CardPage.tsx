import Box from "@mui/material/Box";
import type { AriaRole, ReactNode } from "react";
import { space } from "../theme/tokens";
import Logo from "./Logo";
import { Panel, PanelBody } from "./Panel";

/** A single card centred on the page: Sign In, Account Not Ready, and the error screen. */
export default function CardPage({ role, children }: { role?: AriaRole; children: ReactNode }) {
  return (
    <Box component="main" sx={{ display: "grid", placeItems: "center", minHeight: "100vh", padding: space(4) }}>
      <Panel component="div" role={role} sx={{ width: "100%", maxWidth: 400 }}>
        <PanelBody>{children}</PanelBody>
      </Panel>
    </Box>
  );
}

/** Logo and product name at the top of a card. */
export function CardBrand() {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: space(3), marginBottom: space(5), fontWeight: 600 }}>
      <Logo />
      <span translate="no">Smart Inventory</span>
    </Box>
  );
}
