/** Scrolls to a heading and moves keyboard focus to it. Returns false when it is not on the page. */
export function focusSection(headingId: string): boolean {
  const heading = document.getElementById(headingId);
  if (!heading) return false;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  heading.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  heading.focus({ preventScroll: true });
  return true;
}
