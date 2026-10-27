import { initials } from "../../features/auth/profile";

/** Initials in a circle. Decorative: the person's name is always shown next to it. */
export default function Avatar({ name, size = 40 }) {
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.38 }} aria-hidden="true">
      {initials(name)}
    </span>
  );
}
