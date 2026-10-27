import type { ButtonHTMLAttributes, ReactNode } from "react";
import Spinner from "./Spinner";

type Variant = "primary" | "secondary" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
  loadingLabel?: string;
  block?: boolean;
  children: ReactNode;
}

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
}: ButtonProps) {
  const classes = ["btn", `btn--${variant}`, block && "btn--block", className].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} disabled={disabled || loading} aria-busy={loading || undefined} {...rest}>
      {loading && <Spinner />}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
}
