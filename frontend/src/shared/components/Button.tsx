import MuiButton from "@mui/material/Button";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import Spinner from "./Spinner";

type Variant = "primary" | "secondary" | "ghost";
type Size = "medium" | "small";

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "color"> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  loadingLabel?: string;
  block?: boolean;
  children: ReactNode;
}

const MUI_VARIANT = { primary: "contained", secondary: "outlined", ghost: "text" } as const;

/** Disabled while loading, with a spinner and the busy label (never a silent disable). */
export default function Button({
  variant = "primary",
  size = "medium",
  loading = false,
  loadingLabel,
  block = false,
  type = "button",
  disabled,
  children,
  ...rest
}: ButtonProps) {
  return (
    <MuiButton
      type={type}
      variant={MUI_VARIANT[variant]}
      size={size}
      fullWidth={block}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading && <Spinner />}
      {loading && loadingLabel ? loadingLabel : children}
    </MuiButton>
  );
}
