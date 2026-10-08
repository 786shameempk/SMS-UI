import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * Makes a single-row strip (tabs, a sub-menu) reachable when it doesn't fit: it tracks whether more items are hidden past
 * either edge, turns a vertical mouse-wheel into sideways scrolling while there is more to reveal, keeps the active item in view,
 * and offers `nudge` for the arrow buttons. Attach `setRef` to the scrolling element.
 */
export function useScrollStrip(activeSelector: string, forwardedRef?: React.ForwardedRef<HTMLDivElement>) {
  const stripRef = React.useRef<HTMLDivElement | null>(null);
  const [more, setMore] = React.useState({ start: false, end: false });
  // The strip may mount later than its owner (a menu that only exists on some pages), so the effect keys off the node itself.
  const [node, setNode] = React.useState<HTMLDivElement | null>(null);

  const setRef = React.useCallback(
    (el: HTMLDivElement | null) => {
      stripRef.current = el;
      setNode(el);
      if (typeof forwardedRef === "function") forwardedRef(el);
      else if (forwardedRef) forwardedRef.current = el;
    },
    [forwardedRef],
  );

  const measure = React.useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const start = el.scrollLeft > 1;
    const end = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
    setMore((prev) => (prev.start === start && prev.end === end ? prev : { start, end }));
  }, []);

  const revealActive = React.useCallback(() => {
    const el = stripRef.current;
    const active = el?.querySelector<HTMLElement>(activeSelector);
    if (!el || !active) return;
    const left = active.offsetLeft;
    const right = left + active.offsetWidth;
    if (left < el.scrollLeft) el.scrollLeft = Math.max(0, left - 32);
    else if (right > el.scrollLeft + el.clientWidth) el.scrollLeft = right - el.clientWidth + 32;
  }, [activeSelector]);

  React.useEffect(() => {
    const el = node;
    if (!el) return;
    measure();
    revealActive();
    el.addEventListener("scroll", measure, { passive: true });
    const onWheel = (e: WheelEvent) => {
      // A vertical wheel turn scrolls the strip sideways while there is more to reveal in that direction; otherwise the page scrolls.
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX) || e.ctrlKey) return;
      const canMove = e.deltaY > 0 ? el.scrollLeft + el.clientWidth < el.scrollWidth - 1 : el.scrollLeft > 0;
      if (!canMove) return;
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    const observers: Array<{ disconnect: () => void }> = [];
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      Array.from(el.children).forEach((c) => ro.observe(c));
      observers.push(ro);
    }
    if (typeof MutationObserver !== "undefined") {
      const mo = new MutationObserver((records) => {
        measure();
        if (records.some((r) => r.type === "attributes")) revealActive();
      });
      mo.observe(el, { attributes: true, attributeFilter: ["data-state", "aria-current"], childList: true, subtree: true });
      observers.push(mo);
    }
    return () => {
      el.removeEventListener("scroll", measure);
      el.removeEventListener("wheel", onWheel);
      observers.forEach((o) => o.disconnect());
    };
  }, [node, measure, revealActive]);

  const nudge = React.useCallback((dir: -1 | 1) => {
    const el = stripRef.current;
    el?.scrollBy({ left: dir * Math.max(120, el.clientWidth * 0.6), behavior: "smooth" });
  }, []);

  return { setRef, more, nudge };
}

/** The "show more" arrow shown over whichever edge of a strip still has items hidden past it. */
export function ScrollArrow({ dir, onClick, className }: { dir: -1 | 1; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={dir < 0 ? "Show previous items" : "Show more items"}
      onClick={onClick}
      className={cn(
        "absolute top-1/2 z-10 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:text-foreground cursor-pointer print:hidden",
        dir < 0 ? "left-0" : "right-0",
        className,
      )}
    >
      {dir < 0 ? <ChevronLeft className="h-4 w-4" aria-hidden /> : <ChevronRight className="h-4 w-4" aria-hidden />}
    </button>
  );
}
