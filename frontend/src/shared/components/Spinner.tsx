import CircularProgress from "@mui/material/CircularProgress";

/** Small busy indicator in the current text colour. Decorative: the busy label next to it carries the meaning. */
export default function Spinner() {
  return <CircularProgress size={16} thickness={5} color="inherit" aria-hidden="true" />;
}
