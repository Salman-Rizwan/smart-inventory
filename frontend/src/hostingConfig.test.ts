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

  it("caches hashed assets for a year and never caches index.html, so a new deploy shows at once", () => {
    const value = (source: string) =>
      hosting.headers.find((h: { source: string }) => h.source === source)?.headers[0].value;
    expect(value("/assets/**")).toBe("public, max-age=31536000, immutable");
    expect(value("/index.html")).toBe("no-cache");
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
