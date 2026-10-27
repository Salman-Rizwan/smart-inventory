/** Single source of truth for roles: label, landing page, navigation and which features they see. */
export const ROLES = {
  shopkeeper: {
    label: "Shopkeeper",
    home: "/dashboard",
    alerts: true, // sees discrepancy alerts (bell and panel)
    orders: false,
    nav: [{ to: "/dashboard", label: "Dashboard" }],
  },
  dealer: {
    label: "Dealer",
    home: "/orders",
    alerts: false,
    orders: true, // sees purchase orders (bell and page)
    nav: [{ to: "/orders", label: "Purchase Orders" }],
  },
};

export const isRole = (value) => Object.hasOwn(ROLES, value);
