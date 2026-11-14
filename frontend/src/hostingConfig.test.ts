import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = join(import.meta.dirname, "..", "..");
const readJson = (name: string) => JSON.parse(readFileSync(join(root, name), "utf8"));

describe("Firebase Hosting configuration", () => {
  const config = readJson("firebase.json");
  const hosting = config.hosting;

  it("deploys the Vite build output", () => {
    expect(hosting.public).toBe("frontend/dist");
  });

  it("sends every path to index.html, so a refresh on /alerts?alert=ID still opens the app", () => {
    expect(hosting.rewrites).toContainEqual({ source: "**", destination: "/index.html" });
  });

  it("never caches a page, so a new deploy shows at once", () => {
    // A rule for "/index.html" alone is not enough: Hosting redirects that path to "/", and "/" and every
    // rewritten route (/alerts, /orders) would keep the default one-hour cache. So every path gets no-cache.
    const rule = hosting.headers.find((h: { source: string }) => h.source === "**");
    expect(rule?.headers).toEqual([{ key: "Cache-Control", value: "no-cache" }]);
  });

  it("caches hashed assets for a year, with that rule after the general one so it wins", () => {
    const sources = hosting.headers.map((h: { source: string }) => h.source);
    const assets = hosting.headers[sources.indexOf("/assets/**")];
    expect(assets.headers).toEqual([{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]);
    expect(sources.indexOf("/assets/**")).toBeGreaterThan(sources.indexOf("**"));
  });

  it("deploys Hosting only: no firestore key, so a deploy can never publish the security rules", () => {
    expect(Object.keys(config)).toEqual(["hosting"]);
  });

  it("targets the same Firebase project as the app", () => {
    const rc = readJson(".firebaserc");
    const app = readFileSync(join(import.meta.dirname, "firebase.js"), "utf8");
    expect(rc.projects.default).toBe("smart-inventory-da834");
    expect(app).toContain(`projectId: "${rc.projects.default}"`);
  });
});
