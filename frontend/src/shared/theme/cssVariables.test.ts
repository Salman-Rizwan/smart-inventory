/// <reference types="node" />
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { legacyCssVariables } from "./cssVariables";
import { theme } from "./theme";

// Vitest serves CSS imports as empty strings, so read the stylesheets from disk (tests run from frontend/).
const srcDir = join(process.cwd(), "src");
const stylesheets = readdirSync(srcDir, { recursive: true, encoding: "utf8" })
  .filter((path) => path.endsWith(".css"))
  .map((path) => readFileSync(join(srcDir, path), "utf8"));
const variables = legacyCssVariables(theme);

describe("legacyCssVariables", () => {
  it("defines every variable the stylesheets use", () => {
    const used = new Set<string>();
    for (const css of stylesheets) {
      for (const match of css.matchAll(/var\((--[a-z0-9-]+)/g)) used.add(match[1]);
    }
    expect(used.size).toBeGreaterThan(0); // only base.css is left; MUI-14 removes it and this file
    const missing = [...used].filter((name) => !name.startsWith("--mui-") && !(name in variables));
    expect(missing).toEqual([]);
  });

  it("points colours at the theme's own variables", () => {
    expect(variables["--color-accent"]).toMatch(/^var\(--mui-palette-primary-main/);
    expect(variables["--color-error-bg"]).toMatch(/^var\(--mui-palette-error-light/);
    expect(variables["--color-border-strong"]).toMatch(/^var\(--mui-palette-border-strong/);
  });

  it("builds spacing from the theme's 4px grid", () => {
    expect(variables["--space-1"]).toBe("calc(1 * var(--mui-spacing, 4px))");
    expect(variables["--space-5"]).toBe("calc(6 * var(--mui-spacing, 4px))");
    expect(variables["--space-7"]).toBe("calc(12 * var(--mui-spacing, 4px))");
  });

  it("keeps the corners square", () => {
    expect(variables["--radius"]).toMatch(/0px\)$/);
  });
});
