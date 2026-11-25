import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import IconButton from "@mui/material/IconButton";
import InputAdornment from "@mui/material/InputAdornment";
import InputBase from "@mui/material/InputBase";
import { useId, useState, type FocusEventHandler, type InputHTMLAttributes, type ChangeEventHandler } from "react";
import { EyeIcon, EyeOffIcon } from "./icons";

interface FormFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "value" | "onChange" | "onBlur"> {
  label: string;
  error?: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  onBlur?: FocusEventHandler<HTMLInputElement>;
}

/**
 * Labelled text field: the label sits above, the error is linked to the input, and a password
 * field gets a Show Password toggle (stable name, state in aria-pressed).
 */
export default function FormField({
  label,
  error,
  type = "text",
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  autoComplete,
  disabled,
  ...inputProps
}: FormFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [revealed, setRevealed] = useState(false);
  const isPassword = type === "password";

  const toggle = isPassword && (
    <InputAdornment position="end">
      <IconButton aria-label="Show password" aria-pressed={revealed} onClick={() => setRevealed((r) => !r)}>
        {revealed ? <EyeOffIcon /> : <EyeIcon />}
      </IconButton>
    </InputAdornment>
  );

  return (
    <FormControl fullWidth error={Boolean(error)} sx={{ gap: 2 }}>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      <InputBase
        id={id}
        type={isPassword && revealed ? "text" : type}
        name={name}
        value={value}
        onChange={onChange}
        onBlur={onBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        disabled={disabled}
        endAdornment={toggle || undefined}
        inputProps={{ "aria-describedby": error ? errorId : undefined, ...inputProps }}
      />
      {error && <FormHelperText id={errorId}>{error}</FormHelperText>}
    </FormControl>
  );
}
