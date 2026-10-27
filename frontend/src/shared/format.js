const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" });
const time = new Intl.DateTimeFormat(undefined, { timeStyle: "medium" });
const integer = new Intl.NumberFormat();
const signed = new Intl.NumberFormat(undefined, { signDisplay: "exceptZero" });

export const formatDateTime = (date) => (date ? dateTime.format(date) : "—");
export const formatTime = (date) => (date ? time.format(date) : "—");
export const formatInteger = (n) => (Number.isFinite(n) ? integer.format(n) : "—");
export const formatSigned = (n) => (Number.isFinite(n) ? signed.format(n) : "—");
