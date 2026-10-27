import { describe, expect, it, vi } from "vitest";

vi.mock("../../firebase", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({ doc: vi.fn(), getDoc: vi.fn() }));

import { initials, parseProfile } from "./profile";

describe("initials", () => {
  it.each([
    ["Test Dealer", "TD"],
    ["Test Shopkeeper", "TS"],
    ["salman", "S"],
    ["  ada   king  lovelace ", "AL"],
    ["", "?"],
    [undefined, "?"],
  ])("%j -> %s", (name, expected) => expect(initials(name)).toBe(expected));
});

describe("parseProfile", () => {
  it("accepts a known role and trims the name", () => {
    expect(parseProfile({ name: "  Test Dealer ", role: "dealer" })).toEqual({ name: "Test Dealer", role: "dealer" });
  });

  it("falls back to a generic name when it is missing or not text", () => {
    expect(parseProfile({ role: "shopkeeper" }).name).toBe("User");
    expect(parseProfile({ name: 42, role: "shopkeeper" }).name).toBe("User");
  });

  it.each([undefined, null, {}, { name: "X" }, { name: "X", role: "admin" }, { name: "X", role: "__proto__" }])(
    "rejects a missing or unknown role: %j",
    (data) => expect(parseProfile(data)).toBeNull(),
  );
});
