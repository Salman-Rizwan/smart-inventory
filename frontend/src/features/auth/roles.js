/** Single source of truth for roles: label, landing page, navigation and which features they see. Every role has the notification bell. */
export const ROLES = {
  shopkeeper: {
    label: "Shopkeeper",
    home: "/dashboard",
    alerts: true, // sees discrepancy alerts (bell, dashboard summary and the Alerts page)
    orders: true, // sees the orders page and confirms receipt
    // badge: the count of work waiting on that tab (open alerts; orders waiting for this role to act)
    nav: [
      { to: "/dashboard", label: "Dashboard" },
      { to: "/alerts", label: "Alerts", badge: "alerts" },
      { to: "/orders", label: "Orders", badge: "orders" },
    ],
  },
  dealer: {
    label: "Dealer",
    home: "/orders",
    alerts: false,
    orders: true, // sees purchase orders (page and bell)
    nav: [{ to: "/orders", label: "Purchase Orders" }],
  },
};

export const isRole = (value) => Object.hasOwn(ROLES, value);

/** The nav label of the page at `pathname`, used in the browser tab title; undefined off the nav. */
export const pageLabel = (nav, pathname) => nav.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`))?.label;
