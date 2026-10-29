import { describe, expect, it } from "vitest";
import { color } from "./tokens";

function luminance(hex: string): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("WCAG AA contrast of the token pairs", () => {
  const textPairs: [string, string, string][] = [
    ["ink on canvas", color.ink, color.canvas],
    ["ink on surface", color.ink, color.surface],
    ["muted ink on canvas", color.inkMuted, color.canvas],
    ["muted ink on surface", color.inkMuted, color.surface],
    ["muted ink on strong surface (disabled buttons)", color.inkMuted, color.surfaceStrong],
    ["white on accent", color.onAccent, color.accent],
    ["white on accent hover", color.onAccent, color.accentHover],
    ["white on accent active", color.onAccent, color.accentActive],
    ["accent on canvas (links, outlined buttons)", color.accent, color.canvas],
    ["accent on surface (links)", color.accent, color.surface],
    ["accent hover on info tint (outlined hover)", color.accentHover, color.infoBg],
    ["success on its tint", color.success, color.successBg],
    ["error on its tint", color.error, color.errorBg],
    ["warning on its tint", color.warning, color.warningBg],
    ["info on its tint", color.info, color.infoBg],
  ];

  it.each(textPairs)("%s is at least 4.5:1", (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  const uiPairs: [string, string, string][] = [
    ["strong border on canvas", color.borderStrong, color.canvas],
    ["strong border on surface (input underline)", color.borderStrong, color.surface],
    ["focus ring on canvas", color.accent, color.canvas],
    ["focus ring on surface", color.accent, color.surface],
  ];

  it.each(uiPairs)("%s is at least 3:1", (_, fg, bg) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(3);
  });
});
