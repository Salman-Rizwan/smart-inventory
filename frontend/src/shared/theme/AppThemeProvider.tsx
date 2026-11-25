import GlobalStyles from "@mui/material/GlobalStyles";
import { ThemeProvider } from "@mui/material/styles";
import type { ReactNode } from "react";
import { globalStyles } from "./globalStyles";
import { theme } from "./theme";

/** Applies the MUI theme and the page-wide rules. */
export default function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <GlobalStyles styles={globalStyles} />
      {children}
    </ThemeProvider>
  );
}
