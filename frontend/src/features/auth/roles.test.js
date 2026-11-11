import { describe, expect, it } from "vitest";
import { pageLabel, ROLES } from "./roles";

describe("ROLES", () => {
  it("gives the shopkeeper Dashboard, Alerts, Orders, Products and Insights, each count on its own tab", () => {
    expect(ROLES.shopkeeper.nav).toEqual([
      { to: "/dashboard", label: "Dashboard" },
      { to: "/alerts", label: "Alerts", badge: "alerts" },
      { to: "/orders", label: "Orders", badge: "orders" },
      { to: "/products", label: "Products" },
      { to: "/insights", label: "Insights" },
    ]);
    expect(ROLES.shopkeeper.insights).toBe(true);
  });

  it("gives the dealer purchase orders only, with no alerts", () => {
    expect(ROLES.dealer.nav.map((item) => item.to)).toEqual(["/orders"]);
    expect(ROLES.dealer.alerts).toBe(false);
    expect(ROLES.dealer.stock).toBe(false); // never sees the shop's stock, costs or prices
    expect(ROLES.dealer.insights).toBe(false);
    expect(ROLES.shopkeeper.stock).toBe(true);
  });

  it("starts each role on a page in its own nav", () => {
    for (const role of Object.values(ROLES)) expect(role.nav.some((item) => item.to === role.home)).toBe(true);
  });
});

describe("pageLabel", () => {
  const nav = ROLES.shopkeeper.nav;

  it("names the page at a path, query strings aside", () => {
    expect(pageLabel(nav, "/alerts")).toBe("Alerts");
    expect(pageLabel(nav, "/orders")).toBe("Orders");
    expect(pageLabel(nav, "/products")).toBe("Products");
    expect(pageLabel(nav, "/insights")).toBe("Insights");
    expect(pageLabel(ROLES.dealer.nav, "/orders")).toBe("Purchase Orders");
  });

  it("matches whole path segments only", () => {
    expect(pageLabel(nav, "/alerts/x")).toBe("Alerts");
    expect(pageLabel(nav, "/alertsx")).toBeUndefined();
    expect(pageLabel(nav, "/")).toBeUndefined();
  });
});
