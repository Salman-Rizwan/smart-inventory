import type { Theme } from "@mui/material/styles";
import { font, layout, spaceSteps, text } from "./tokens";

/**
 * The CSS variables the existing stylesheets use (--color-*, --space-*, --text-*, ...), generated
 * from the theme so the theme stays the only source. Colours and spacing point at MUI's own
 * variables. Removed in MUI-14 once no stylesheet uses them.
 */
export function legacyCssVariables(theme: Theme): Record<string, string> {
  if (!theme.vars) throw new Error("The theme must be created with cssVariables: true");
  const { palette, spacing, shape } = theme.vars;
  const spaces = Object.fromEntries(
    Object.entries(spaceSteps).map(([step, units]) => [`--space-${step}`, `calc(${units} * ${spacing})`]),
  );
  const sizes = Object.fromEntries(Object.entries(text).map(([name, size]) => [`--text-${name}`, size]));
  return {
    colorScheme: "light",

    "--color-accent": palette.primary.main,
    "--color-accent-hover": palette.accent.hover,
    "--color-accent-active": palette.accent.active,
    "--color-on-accent": palette.primary.contrastText,

    "--color-ink": palette.text.primary,
    "--color-ink-muted": palette.text.secondary,
    "--color-canvas": palette.background.paper,
    "--color-surface": palette.surface.main,
    "--color-surface-strong": palette.surface.strong,
    "--color-border": palette.border.main,
    "--color-border-strong": palette.border.strong,

    "--color-success": palette.success.main,
    "--color-success-bg": palette.success.light,
    "--color-error": palette.error.main,
    "--color-error-bg": palette.error.light,
    "--color-warning": palette.warning.main,
    "--color-warning-bg": palette.warning.light,
    "--color-info": palette.info.main,
    "--color-info-bg": palette.info.light,

    ...spaces,

    "--font-sans": font.sans,
    "--font-mono": font.mono,
    ...sizes,

    "--radius": String(shape.borderRadius),
    "--header-height": layout.headerHeight,
    "--content-max": layout.contentMax,
    "--focus-ring": `2px solid ${palette.primary.main}`,
  };
}
