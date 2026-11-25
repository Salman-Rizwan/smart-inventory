/** Scrolls an element into view (instantly when reduced motion is asked for) and moves keyboard focus to it. */
export function focusElement(element: HTMLElement, block: ScrollLogicalPosition = "start"): void {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  element.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block });
  element.focus({ preventScroll: true });
}

/** Scrolls to a heading and moves keyboard focus to it. Returns false when it is not on the page. */
export function focusSection(headingId: string): boolean {
  const heading = document.getElementById(headingId);
  if (!heading) return false;
  focusElement(heading);
  return true;
}
