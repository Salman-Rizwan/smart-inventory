const KNOWN_LABELS = {
  spark_plug: "Spark Plug",
  petrol_filter: "Petrol Filter",
};

/**
 * Display name for a model class. Parts are never hardcoded in the UI (NFR7): a new
 * class from the model shows up automatically, with a readable fallback label.
 */
export function partLabel(key) {
  if (KNOWN_LABELS[key]) return KNOWN_LABELS[key];
  return key
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
