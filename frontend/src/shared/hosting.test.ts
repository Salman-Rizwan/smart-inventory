import { describe, expect, it } from "vitest";
import { isHostedOrigin } from "./hosting";

describe("isHostedOrigin", () => {
  it.each(["smart-inventory-da834.web.app", "smart-inventory-da834.firebaseapp.com", "shop.example.com"])(
    "is hosted on %s",
    (hostname) => expect(isHostedOrigin(hostname)).toBe(true),
  );

  it.each(["localhost", "127.0.0.1", "[::1]"])("is the shop laptop on %s", (hostname) =>
    expect(isHostedOrigin(hostname)).toBe(false),
  );

  it("reads the current page by default (the test browser is localhost)", () => {
    expect(isHostedOrigin()).toBe(false);
  });
});
