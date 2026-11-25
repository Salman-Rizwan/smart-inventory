import Box from "@mui/material/Box";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface TableScrollProps {
  /** Names the region for screen readers, for example "Active alerts". */
  label: string;
  children: ReactNode;
}

/**
 * Horizontal scroll box for a wide table. When the table is wider than the box (phones), the box
 * becomes a labelled, focusable region so keyboard users can scroll it with the arrow keys.
 * When nothing overflows it stays out of the tab order. Its visible width is published as
 * --table-scroll-width so a row's error message can stay within view (see ErrorRow).
 */
export default function TableScroll({ label, children }: TableScrollProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [scrollable, setScrollable] = useState(false);
  const [width, setWidth] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      setScrollable(el.scrollWidth > el.clientWidth);
      setWidth(el.clientWidth);
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    if (el.firstElementChild) observer.observe(el.firstElementChild);
    return () => observer.disconnect();
  }, []);

  return (
    <Box
      ref={ref}
      role="region"
      aria-label={label}
      tabIndex={scrollable ? 0 : undefined}
      style={width ? ({ "--table-scroll-width": `${width}px` } as CSSProperties) : undefined}
      sx={{ overflowX: "auto", "&:focus-visible": { outlineOffset: "-2px" } }}
    >
      {children}
    </Box>
  );
}
