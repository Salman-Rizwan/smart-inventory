/** Single source of truth for roles: label, landing page and navigation. */
export const ROLES = {
  shopkeeper: {
    label: "Shopkeeper",
    home: "/dashboard",
    nav: [{ to: "/dashboard", label: "Dashboard" }],
  },
  dealer: {
    label: "Dealer",
    home: "/orders",
    nav: [{ to: "/orders", label: "Purchase Orders" }],
  },
};

export const isRole = (value) => Object.hasOwn(ROLES, value);
