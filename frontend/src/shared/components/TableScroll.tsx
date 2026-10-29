import { useEffect, useRef, useState, type ReactNode } from "react";

interface TableScrollProps {
  /** Names the region for screen readers, for example "Active alerts". */
  label: string;
  children: ReactNode;
}

/**
 * Horizontal scroll box for a wide table. When the table is wider than the box (phones), the box
 * becomes a labelled, focusable region so keyboard users can scroll it with the arrow keys.
 * When nothing overflows it stays out of the tab order.
 */
export default function TableScroll({ label, children }: TableScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setScrollable(el.scrollWidth > el.clientWidth);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className="table-scroll"
      role="region"
      aria-label={label}
      tabIndex={scrollable ? 0 : undefined}
    >
      {children}
    </div>
  );
}
