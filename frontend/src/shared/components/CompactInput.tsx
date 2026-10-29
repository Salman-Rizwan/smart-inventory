import InputBase from "@mui/material/InputBase";
import type { ChangeEventHandler, InputHTMLAttributes } from "react";

interface CompactInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "value" | "onChange"> {
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  invalid?: boolean;
}

/** Small numeric entry for table rows (monospace, right-aligned). Needs an aria-label: it has no visible label. */
export default function CompactInput({ value, onChange, invalid = false, name, disabled, placeholder, autoComplete, ...inputProps }: CompactInputProps) {
  return (
    <InputBase
      size="small"
      value={value}
      onChange={onChange}
      error={invalid}
      name={name}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete={autoComplete}
      inputProps={inputProps}
    />
  );
}
