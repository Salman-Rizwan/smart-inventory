/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { globalStyles } from "./globalStyles";
import { color, font } from "./tokens";

// Tests run from frontend/.
const srcDir = join(process.cwd(), "src");
const sourceFiles = readdirSync(srcDir, { recursive: true, encoding: "utf8" });

describe("globalStyles", () => {
  it("sets the body font and colours from the tokens", () => {
    expect(globalStyles.body).toMatchObject({ fontFamily: font.sans, color: color.ink, background: color.surface });
  });

  it("shows a teal focus ring for keyboard focus", () => {
    expect(globalStyles[":focus-visible"].outline).toBe(`2px solid ${color.accent}`);
  });

  it("all but stops animation and transitions when the user asks for reduced motion", () => {
    const rule = globalStyles["@media (prefers-reduced-motion: reduce)"]["*, *::before, *::after"];
    expect(rule.animationDuration).toMatch(/^0\.01ms !important$/);
    expect(rule.transitionDuration).toMatch(/^0\.01ms !important$/);
  });
});

describe("styling stays in one place", () => {
  it("has no stylesheets left in src (the fonts are imported from their packages)", () => {
    expect(sourceFiles.filter((path) => path.endsWith(".css"))).toEqual([]);
  });

  it("uses no old CSS variables (--color-*, --space-*, --text-*, ...) anywhere", () => {
    const legacy = /var\(--(color|space|text|font|radius|header|content|focus)-/;
    const offenders = sourceFiles
      .filter((path) => /\.(tsx?|jsx?)$/.test(path))
      .filter((path) => legacy.test(readFileSync(join(srcDir, path), "utf8")));
    expect(offenders).toEqual([]);
  });
});
