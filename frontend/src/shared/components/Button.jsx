import Spinner from "./Spinner";

/** Disabled while loading, with a spinner and the busy label (never a silent disable). */
export default function Button({
  variant = "primary",
  loading = false,
  loadingLabel,
  block = false,
  type = "button",
  disabled,
  children,
  className = "",
  ...rest
}) {
  const classes = ["btn", `btn--${variant}`, block && "btn--block", className].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
