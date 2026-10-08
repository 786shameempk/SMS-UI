import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

const OPEN_DELAY_MS = 350;
/** Moving straight from one cut-off label to the next reopens without the delay, like Radix tooltips. */
const SKIP_DELAY_MS = 300;
const GAP = 8;
const MAX_TEXT = 400;
/** How far up from the hovered node to look for the element that does the truncating. */
const MAX_DEPTH = 6;

function isClippedText(el: HTMLElement): boolean {
  const style = getComputedStyle(el);
  if (style.textOverflow === "ellipsis" && style.overflowX !== "visible" && el.scrollWidth > el.clientWidth + 1) return true;
  const clamp = style.getPropertyValue("-webkit-line-clamp") || (style as CSSStyleDeclaration & { webkitLineClamp?: string }).webkitLineClamp;
  return !!clamp && clamp !== "none" && el.scrollHeight > el.clientHeight + 1;
}

/** A tab in a sideways-scrolling strip (TabsList) that is partly scrolled out of view. */
function isClippedTab(el: HTMLElement): boolean {
  if (el.getAttribute("role") !== "tab" || !el.parentElement) return false;
  const box = el.parentElement.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && (rect.left < box.left - 1 || rect.right > box.right + 1);
}

function eligible(el: HTMLElement): boolean {
  if (el.closest("input, textarea, select, [contenteditable=''], [contenteditable='true'], [data-no-overflow-tooltip]")) return false;
  // An element with its own title already shows the browser tooltip; don't stack a second one on it.
  return !el.hasAttribute("title");
}

/** The element whose text is cut off at or above `node`, if any. */
function truncatedFrom(node: EventTarget | null): HTMLElement | null {
  let el = node instanceof HTMLElement ? node : node instanceof Node ? node.parentElement : null;
  for (let depth = 0; el && depth < MAX_DEPTH && el !== document.body; depth++, el = el.parentElement) {
    if (!eligible(el)) continue;
    if (isClippedText(el) || isClippedTab(el)) return el;
  }
  return null;
}

/** For keyboard focus: the focused control itself, or the first cut-off label inside it. */
function truncatedWithin(el: HTMLElement): HTMLElement | null {
  const self = truncatedFrom(el);
  if (self) return self;
  const inner = el.querySelectorAll<HTMLElement>("*");
  for (let i = 0; i < inner.length && i < 40; i++) {
    if (eligible(inner[i]) && isClippedText(inner[i])) return inner[i];
  }
  return null;
}

function fullText(el: HTMLElement): string {
  const text = (el.innerText || el.textContent || "").replace(/\s+/g, " ").trim();
  return text.length > MAX_TEXT ? text.slice(0, MAX_TEXT - 1) + "…" : text;
}

interface Shown {
  anchor: HTMLElement;
  text: string;
}

/**
 * Mounted once at the app root. Whenever a label is visually cut off - `truncate` / `text-overflow: ellipsis`,
 * `line-clamp-*`, or a tab half scrolled out of its strip - hovering it (or focusing the control that holds it)
 * shows the full text in the same style as the app's Radix tooltips. Labels that fit never get one, so nothing
 * has to opt in screen by screen; add `data-no-overflow-tooltip` to an element to opt it out.
 *
 * The tooltip is aria-hidden: clipping is only visual, so screen readers already read the whole label.
 * Touch taps are ignored - a tap on a truncated link should navigate, not pop a tooltip.
 */
export function OverflowTooltip() {
  const [shown, setShown] = useState<Shown | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const tipRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);
  const lastClosed = useRef(0);
  const current = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const cancel = () => window.clearTimeout(timer.current);
    const hide = () => {
      cancel();
      if (current.current) lastClosed.current = Date.now();
      current.current = null;
      setShown(null);
      setPos(null);
    };
    const open = (anchor: HTMLElement) => {
      if (anchor === current.current) return;
      cancel();
      const show = () => {
        // Layout may have changed while waiting (resize, data loaded); only show if it is still cut off.
        if (!anchor.isConnected || !(isClippedText(anchor) || isClippedTab(anchor))) return;
        const text = fullText(anchor);
        if (!text) return;
        current.current = anchor;
        setPos(null);
        setShown({ anchor, text });
      };
      const warm = current.current !== null || Date.now() - lastClosed.current < SKIP_DELAY_MS;
      if (current.current) hide();
      if (warm) show();
      else timer.current = window.setTimeout(show, OPEN_DELAY_MS);
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const anchor = truncatedFrom(e.target);
      if (anchor) open(anchor);
      else if (current.current && !(e.target instanceof Node && current.current.contains(e.target))) hide();
      else if (!current.current) cancel();
    };
    const onOut = (e: PointerEvent) => {
      const to = e.relatedTarget;
      if (current.current && to instanceof Node && current.current.contains(to)) return;
      if (!(to instanceof Node) || !truncatedFrom(to)) hide();
    };
    const onFocusIn = (e: FocusEvent) => {
      if (!(e.target instanceof HTMLElement) || !e.target.matches(":focus-visible")) return;
      const anchor = truncatedWithin(e.target);
      if (anchor) open(anchor);
      else hide();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };

    document.addEventListener("pointerover", onOver);
    document.addEventListener("pointerout", onOut);
    document.addEventListener("pointerdown", hide, true);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", hide);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    window.addEventListener("blur", hide);
    return () => {
      cancel();
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("pointerout", onOut);
      document.removeEventListener("pointerdown", hide, true);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", hide);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
      window.removeEventListener("blur", hide);
    };
  }, []);

  // Place above the label, centred and kept on screen; flip below when there is no room above.
  useLayoutEffect(() => {
    if (!shown || !tipRef.current) return;
    const rect = shown.anchor.getBoundingClientRect();
    const tip = tipRef.current.getBoundingClientRect();
    let top = rect.top - tip.height - GAP;
    if (top < GAP) top = rect.bottom + GAP;
    const left = Math.min(Math.max(rect.left + rect.width / 2 - tip.width / 2, GAP), window.innerWidth - tip.width - GAP);
    setPos({ top, left });
  }, [shown]);

  if (!shown) return null;
  return createPortal(
    <div
      ref={tipRef}
      role="tooltip"
      aria-hidden="true"
      data-testid="overflow-tooltip"
      style={{ position: "fixed", top: pos?.top ?? 0, left: pos?.left ?? 0, visibility: pos ? "visible" : "hidden" }}
      className="pointer-events-none z-[100] max-w-xs break-words rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background shadow-md animate-in fade-in-0 zoom-in-95"
    >
      {shown.text}
    </div>,
    document.body,
  );
}
