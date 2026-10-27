/** Single source of truth for roles: label, landing page, navigation and which features they see. */
export const ROLES = {
  shopkeeper: {
    label: "Shopkeeper",
    home: "/dashboard",
    alerts: true, // sees discrepancy alerts (bell and panel)
    orders: true, // sees the orders page and confirms receipt
    orderBell: false,
    nav: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/orders", label: "Orders", badge: "orders" }, // badge: orders waiting for this role to act
    ],
  },
  dealer: {
    label: "Dealer",
    home: "/orders",
    alerts: false,
    orders: true, // sees purchase orders (page and bell)
    orderBell: true,
    nav: [{ to: "/orders", label: "Purchase Orders" }],
  },
};

export const isRole = (value) => Object.hasOwn(ROLES, value);
