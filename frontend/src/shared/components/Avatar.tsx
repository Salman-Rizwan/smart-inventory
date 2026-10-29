import MuiAvatar from "@mui/material/Avatar";
import { initials } from "../../features/auth/profile";

/** Initials in a circle. Decorative: the person's name is always shown next to it. */
export default function Avatar({ name, size = 40 }: { name: string; size?: number }) {
  return (
    <MuiAvatar component="span" aria-hidden="true" sx={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initials(name)}
    </MuiAvatar>
  );
}
