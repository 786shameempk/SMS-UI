import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NAV_SECTIONS } from "@/constants/nav";
import { useAuthStore } from "@/store/authStore";
import { useAiCapabilities } from "../capabilities";
import AssistantChat from "./AssistantChat";

/** The nav label of the screen being viewed (longest matching path), sent as a hint so answers start from there. */
function usePageLabel(pathname: string) {
  return useMemo(() => {
    let best: { label: string; length: number } | null = null;
    for (const section of NAV_SECTIONS) {
      for (const item of section.items) {
        if (item.to === "/" || !(pathname === item.to || pathname.startsWith(`${item.to}/`))) continue;
        if (!best || item.to.length > best.length) best = { label: item.label, length: item.to.length };
      }
    }
    return best?.label;
  }, [pathname]);
}

const BUTTON_H = 48;
const EDGE = 8;
const STORAGE_KEY = "sms-ask-ai-position";
const DEFAULT_POS = { right: 16, bottom: 16 };
type Pos = { right: number; bottom: number };

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), Math.max(min, max));

/** Keeps the launcher fully on screen whatever the window size (width is the button's current width). */
function clampPos(p: Pos, width: number): Pos {
  return { right: clamp(p.right, EDGE, window.innerWidth - width - EDGE), bottom: clamp(p.bottom, EDGE, window.innerHeight - BUTTON_H - EDGE) };
}

function readStoredPos(): Pos {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null");
    if (raw && Number.isFinite(raw.right) && Number.isFinite(raw.bottom)) return raw;
  } catch {
    // fall through to the default corner
  }
  return DEFAULT_POS;
}

/**
 * "Ask School AI" from anywhere in the app: a floating button that opens the assistant in a side panel, aware of the
 * screen it was opened from. Shown only when the school and role include AI and the backend reports chat available.
 */
export default function AskAiLauncher() {
  const { pathname } = useLocation();
  const aiModule = useAuthStore((s) => !s.modulePermissions || s.modulePermissions.aiFeatures);
  const { can } = useAiCapabilities();
  const page = usePageLabel(pathname);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Pos>(readStoredPos);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const drag = useRef<{ x: number; y: number; start: Pos; moved: boolean } | null>(null);
  const justDragged = useRef(false);

  const width = () => buttonRef.current?.offsetWidth ?? BUTTON_H;
  const place = useCallback((next: Pos) => setPos(clampPos(next, buttonRef.current?.offsetWidth ?? BUTTON_H)), []);
  const remember = (p: Pos) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
    } catch {
      // best-effort only
    }
  };

  // A smaller window must never leave the button off screen.
  useEffect(() => {
    const onResize = () => place(pos);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place, open]);

  const onPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (e.button !== 0) return;
    drag.current = { x: e.clientX, y: e.clientY, start: pos, moved: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    d.moved = true;
    place({ right: d.start.right - dx, bottom: d.start.bottom - dy });
  };
  const onPointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture?.(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d?.moved) {
      justDragged.current = true; // swallow the click that ends a drag
      remember(clampPos({ right: d.start.right - (e.clientX - d.x), bottom: d.start.bottom - (e.clientY - d.y) }, width()));
    }
  };
  // Shift + arrow keys move it too, for people who can't drag.
  const onKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!e.shiftKey) return;
    const step = 24;
    const delta = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = clampPos({ right: pos.right + delta[0], bottom: pos.bottom + delta[1] }, width());
    setPos(next);
    remember(next);
  };

  // The panel opens where the launcher sits (the launcher steps aside while it is open), growing toward the roomier side.
  const vw = typeof window === "undefined" ? 1024 : window.innerWidth;
  const vh = typeof window === "undefined" ? 768 : window.innerHeight;
  const panelWidth = Math.min(416, vw - 32);
  const launcherInUpperHalf = vh - pos.bottom - BUTTON_H / 2 < vh / 2;
  const panelStyle: React.CSSProperties = {
    right: clamp(pos.right, EDGE, vw - panelWidth - EDGE),
    ...(launcherInUpperHalf
      ? { top: vh - pos.bottom - BUTTON_H, maxHeight: `calc(100dvh - ${vh - pos.bottom - BUTTON_H + EDGE}px)` }
      : { bottom: pos.bottom, maxHeight: `calc(100dvh - ${pos.bottom + EDGE}px)` }),
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // The AI page already is the assistant.
  if (!aiModule || !can("chat") || pathname === "/ai") return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.section
            role="dialog"
            aria-modal="false"
            aria-label="Ask School AI"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            style={panelStyle}
            className="fixed z-40 flex w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
          >
            <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 text-sm font-semibold">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" /> Ask School AI
                </p>
                {page && <p className="truncate text-xs text-muted-foreground">Asking from {page}</p>}
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close Ask School AI">
                <X className="h-4 w-4" />
              </Button>
            </header>
            <div className="overflow-y-auto p-4">
              <AssistantChat page={page} compact />
            </div>
          </motion.section>
        )}
      </AnimatePresence>
      {/* While the panel is open its header X is the only close control, so the launcher steps aside. */}
      {!open && (
        <Button
          ref={buttonRef}
          style={{ right: pos.right, bottom: pos.bottom }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onKeyDown={onKeyDown}
          title="Drag to move"
          onClick={() => {
            if (justDragged.current) {
              justDragged.current = false;
              return;
            }
            setOpen(true);
          }}
          aria-expanded={false}
          aria-label="Ask School AI"
          className="fixed z-40 h-12 cursor-grab touch-none rounded-full px-4 shadow-lg shadow-primary/25 active:cursor-grabbing"
        >
          <Sparkles className="h-5 w-5" />
          <span className="hidden sm:inline">Ask School AI</span>
        </Button>
      )}
    </>
  );
}
