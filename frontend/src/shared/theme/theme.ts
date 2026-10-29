import { createTheme, type Shadows } from "@mui/material/styles";
import { color, font, SPACING_UNIT, text } from "./tokens";

declare module "@mui/material/styles" {
  interface Palette {
    accent: { hover: string; active: string };
    surface: { main: string; strong: string };
    border: { main: string; strong: string };
  }
  interface PaletteOptions {
    accent?: { hover: string; active: string };
    surface?: { main: string; strong: string };
    border?: { main: string; strong: string };
  }
}

const coarse = "@media (pointer: coarse)";

/*
 * MUI theme: the Carbon-style look (flat, square, hairline borders, one teal accent, IBM Plex),
 * built from tokens.ts. Status colours use `main` for the text or icon and `light` for the tint
 * behind it. `cssVariables` publishes every value as --mui-* so plain CSS can follow the theme.
 */
export const theme = createTheme({
  cssVariables: true,
  spacing: SPACING_UNIT,
  shape: { borderRadius: 0 },
  shadows: Array(25).fill("none") as Shadows,
  palette: {
    primary: { main: color.accent, dark: color.accentHover, contrastText: color.onAccent },
    accent: { hover: color.accentHover, active: color.accentActive },
    success: { main: color.success, light: color.successBg },
    error: { main: color.error, light: color.errorBg },
    warning: { main: color.warning, light: color.warningBg },
    info: { main: color.info, light: color.infoBg },
    text: { primary: color.ink, secondary: color.inkMuted },
    background: { default: color.surface, paper: color.canvas },
    surface: { main: color.surface, strong: color.surfaceStrong },
    border: { main: color.border, strong: color.borderStrong },
    divider: color.border,
  },
  typography: {
    fontFamily: font.sans,
    button: { fontSize: text.sm, fontWeight: 400, letterSpacing: "0.02em", textTransform: "none", lineHeight: 1.5 },
  },
  components: {
    // Form fields: label always above (never floating), grey fill, underline only, square.
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: text.sm,
          lineHeight: 1.5,
          color: color.inkMuted,
          "&.Mui-focused, &.Mui-error": { color: color.inkMuted },
        },
      },
    },
    MuiFormHelperText: {
      styleOverrides: {
        root: { margin: 0, fontSize: text.sm, lineHeight: 1.5, letterSpacing: "inherit", fontFamily: "inherit" },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          minHeight: 44,
          padding: "0 16px",
          font: "inherit",
          letterSpacing: "inherit",
          color: color.ink,
          background: color.surface,
          borderBottom: `1px solid ${color.borderStrong}`,
          borderRadius: 0,
          "&.Mui-focused": { outline: `2px solid ${color.accent}`, outlineOffset: "-2px" },
          "&.Mui-error": { borderBottom: `2px solid ${color.error}` },
          "&.MuiInputBase-adornedEnd": { paddingRight: "4px" },
        },
        input: {
          height: "auto",
          padding: 0,
          "&::placeholder": { color: color.inkMuted, opacity: 1 },
        },
        // Compact numeric entry inside table rows (the Qty box).
        sizeSmall: {
          width: "5rem",
          minHeight: 32,
          padding: "0 8px",
          fontFamily: font.mono,
          fontSize: text.sm,
          [coarse]: { minHeight: 44 },
          "& .MuiInputBase-input": { textAlign: "right" },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          color: color.inkMuted,
          "&:hover": { background: color.surfaceStrong, color: color.ink },
          [coarse]: { width: 44, height: 44 },
        },
      },
    },
    // Status badge: tint behind, darker status colour for text, square and compact.
    MuiChip: {
      styleOverrides: {
        root: {
          height: "auto",
          gap: "4px",
          padding: "2px 8px",
          borderRadius: 0,
          fontSize: text.xs,
          fontWeight: 600,
          letterSpacing: "0.02em",
          lineHeight: 1.5,
          whiteSpace: "nowrap",
          verticalAlign: "baseline",
          color: color.inkMuted,
          background: color.surfaceStrong,
        },
        label: { padding: 0, overflow: "visible" },
        icon: { margin: 0, fontSize: "inherit", fontWeight: 700, color: "inherit" },
      },
      variants: [
        { props: { color: "success" }, style: { color: color.success, background: color.successBg } },
        { props: { color: "warning" }, style: { color: color.warning, background: color.warningBg } },
        { props: { color: "error" }, style: { color: color.error, background: color.errorBg } },
        { props: { color: "info" }, style: { color: color.info, background: color.infoBg } },
      ],
    },
    MuiButtonBase: {
      defaultProps: { disableRipple: true },
      styleOverrides: {
        root: {
          "&.Mui-focusVisible": { outline: `2px solid ${color.accent}`, outlineOffset: "2px" },
        },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          gap: "8px",
          minHeight: 40,
          minWidth: 0,
          padding: "0 16px",
          border: "1px solid transparent",
          boxShadow: "none",
          touchAction: "manipulation",
          transition: "background-color 120ms, border-color 120ms, color 120ms",
          [coarse]: { minHeight: 48 },
          "&.Mui-disabled": { background: color.surfaceStrong, color: color.inkMuted, borderColor: "transparent" },
        },
        sizeSmall: { minHeight: 32, padding: "0 12px", fontSize: text.sm, [coarse]: { minHeight: 44 } },
        contained: {
          "&:hover": { background: color.accentHover, boxShadow: "none" },
          "&:active": { background: color.accentActive },
        },
        outlined: {
          background: color.canvas,
          color: color.accent,
          borderColor: color.accent,
          "&:hover": { background: color.infoBg, color: color.accentHover, borderColor: color.accent },
        },
        text: {
          color: color.ink,
          "&:hover": { background: color.surfaceStrong },
        },
      },
    },
  },
});
