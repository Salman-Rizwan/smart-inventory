/*
 * Design tokens: the one place design values live. Carbon-style enterprise UI: flat, square,
 * hairline borders, 4px spacing grid, one teal accent, IBM Plex. The MUI theme is built from
 * these, and the legacy CSS variables (--color-*, --space-*, ...) are generated from the theme
 * (see cssVariables.ts). Colour pairs are checked against WCAG AA in tokens.test.ts
 * (text >= 4.5:1, UI boundaries >= 3:1).
 */
export const color = {
  accent: "#0e6b6f",
  accentHover: "#0a5558",
  accentActive: "#073f42",
  onAccent: "#ffffff",

  ink: "#161616",
  inkMuted: "#525252",
  canvas: "#ffffff",
  surface: "#f4f4f4",
  surfaceStrong: "#e8e8e8",
  border: "#d0d0d0",
  borderStrong: "#8d8d8d",

  success: "#0e6027",
  successBg: "#defbe6",
  error: "#a2191f",
  errorBg: "#fff1f1",
  warning: "#6e5100",
  warningBg: "#fcf4d6",
  info: "#0e6b6f",
  infoBg: "#e0f2f1",
} as const;

/** 4px grid: space(n) = n * 4px. The legacy steps map to these multiples. */
export const SPACING_UNIT = 4;
export const spaceSteps = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 6, 6: 8, 7: 12 } as const;

export const font = {
  sans: '"IBM Plex Sans", "Helvetica Neue", Arial, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, monospace',
} as const;

export const text = {
  xs: "0.75rem",
  sm: "0.875rem",
  md: "1rem",
  lg: "1.25rem",
  xl: "1.75rem",
  display: "3rem",
} as const;

export const layout = {
  headerHeight: "56px",
  contentMax: "1200px",
} as const;

/** Width breakpoints used in media queries (max-width). */
export const breakpoint = {
  /** Phones and small tablets: compact header, name and role hidden. */
  narrow: "640px",
  /** Below this the header avatar is hidden so the nav tabs fit (measured: 320 px needs it, 390 px with a count badge does not). */
  avatarHidden: "389.98px",
  /** Below this the logo link is hidden too (it goes where the first tab goes); 320 px with a count badge needs it. */
  brandHidden: "359.98px",
} as const;
