const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });
const time = new Intl.DateTimeFormat(undefined, { timeStyle: "medium" });
const integer = new Intl.NumberFormat();
const signed = new Intl.NumberFormat(undefined, { signDisplay: "exceptZero" });

/** The shop's currency (ISO 4217), set once in VITE_CURRENCY. */
export const CURRENCY = import.meta.env.VITE_CURRENCY || "LKR";
const money = new Intl.NumberFormat(undefined, { style: "currency", currency: CURRENCY });

export const formatDateTime = (date) => (date ? dateTime.format(date) : "—");
export const formatTime = (date) => (date ? time.format(date) : "—");
export const formatInteger = (n) => (Number.isFinite(n) ? integer.format(n) : "—");
export const formatSigned = (n) => (Number.isFinite(n) ? signed.format(n) : "—");
export const formatMoney = (n) => (Number.isFinite(n) ? money.format(n) : "—");
