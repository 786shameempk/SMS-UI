import { useEffect, useMemo, useState } from "react";
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
            className="fixed bottom-20 right-4 z-40 flex max-h-[calc(100dvh-7rem)] w-[min(26rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
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
      <Button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close Ask School AI" : "Ask School AI"}
        className="fixed bottom-4 right-4 z-40 h-12 rounded-full px-4 shadow-lg shadow-primary/25"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
        <span className="hidden sm:inline">{open ? "Close" : "Ask School AI"}</span>
      </Button>
    </>
  );
}
