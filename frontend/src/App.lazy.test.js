import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Every source file under src/, as [path, text]. */
function sources(dir = join(import.meta.dirname)) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name) ? [[path, readFileSync(path, "utf8")]] : [];
  });
}

describe("the Insights page is lazy-loaded", () => {
  it("is the only route imported with React.lazy, so the charts library stays out of the main bundle", () => {
    const app = readFileSync(join(import.meta.dirname, "App.jsx"), "utf8");
    expect(app).toMatch(/lazy\(\(\) => import\("\.\/features\/insights\/InsightsPage"\)\)/);
    expect(app).not.toMatch(/^import .*InsightsPage/m);
  });

  it("keeps the charts library behind the Insights page: nothing outside the page's charts imports it", () => {
    const importers = sources()
      .filter(([, text]) => /from "@mui\/x-charts/.test(text))
      .map(([path]) => path.replace(/.*\/src\//, ""));
    expect(importers.sort()).toEqual(["features/insights/SalesChart.tsx", "features/insights/ShrinkageChart.tsx"]);
    const chartUsers = sources()
      .filter(([, text]) => /from "\.\/(SalesChart|ShrinkageChart)"/.test(text))
      .map(([path]) => path.replace(/.*\/src\//, ""));
    expect(chartUsers).toEqual(["features/insights/InsightsPage.tsx"]);
  });
});
