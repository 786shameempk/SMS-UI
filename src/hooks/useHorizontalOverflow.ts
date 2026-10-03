import { useLayoutEffect, useState, type RefObject } from "react";

/**
 * Whether the element's content is wider than the element itself.
 *
 * Tables use this to stay `overflow-x: clip` (not a scroll container) while they fit, so a `position: sticky`
 * header can stick to the page as it scrolls; only a table that really is too wide becomes a horizontal
 * scroller (where the header then scrolls with it).
 */
export function useHorizontalOverflow(ref: RefObject<HTMLElement | null>, enabled = true) {
  const [overflowing, setOverflowing] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!enabled || !el || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const content = el.firstElementChild as HTMLElement | null;
      const contentWidth = content ? content.scrollWidth : el.scrollWidth;
      setOverflowing(contentWidth > el.clientWidth + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [ref, enabled]);

  return overflowing;
}
