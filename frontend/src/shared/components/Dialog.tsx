import Box from "@mui/material/Box";
import MuiDialog from "@mui/material/Dialog";
import { useEffect, useId, useRef, type FormEvent, type ReactNode } from "react";
import { color, space } from "../theme/tokens";

interface DialogProps {
  open: boolean;
  title: string;
  /** Closing is blocked while a save is in flight, so a half-finished write is never hidden. */
  busy?: boolean;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** The buttons, rendered at the end of the form (the primary one should be type="submit"). */
  actions: ReactNode;
  children: ReactNode;
}

/**
 * A modal form: square, hairline-bordered, no shadow. MUI handles the focus trap, Escape and
 * returning focus to the button that opened it; the title names the dialog. On opening, focus goes to
 * the first field (MUI would otherwise focus the dialog box itself, after any autoFocus).
 */
export default function Dialog({ open, title, busy = false, onClose, onSubmit, actions, children }: DialogProps) {
  const titleId = useId();
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      formRef.current?.querySelector<HTMLElement>("input:not([disabled]), textarea:not([disabled])")?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [open]);

  return (
    <MuiDialog
      open={open}
      onClose={busy ? undefined : onClose}
      aria-labelledby={titleId}
      fullWidth
      maxWidth="xs"
      slotProps={{
        paper: { sx: { borderRadius: 0, border: `1px solid ${color.borderStrong}`, margin: space(4), width: `calc(100% - ${space(6)})` } },
      }}
    >
      <Box
        component="form"
        ref={formRef}
        noValidate
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          onSubmit(event);
        }}
        sx={{ display: "flex", flexDirection: "column", gap: space(5), padding: space(5) }}
      >
        <h2 id={titleId}>{title}</h2>
        {children}
        <Box sx={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: space(3) }}>{actions}</Box>
      </Box>
    </MuiDialog>
  );
}
