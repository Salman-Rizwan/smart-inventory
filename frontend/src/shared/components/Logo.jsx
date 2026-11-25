import { color } from "../theme/tokens";

/** Brand mark: a 2x2 shelf grid. Decorative; the product name always sits beside it. */
export default function Logo({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" fill={color.accent} />
      <g fill="#fff">
        <rect x="6" y="6" width="9" height="9" />
        <rect x="17" y="6" width="9" height="9" opacity=".55" />
        <rect x="6" y="17" width="9" height="9" opacity=".55" />
        <rect x="17" y="17" width="9" height="9" />
      </g>
    </svg>
  );
}
