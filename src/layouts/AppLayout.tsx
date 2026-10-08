import { Suspense, useEffect, useRef } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Sidebar from "@/components/layouts/Sidebar";
import Header from "@/components/layouts/Header";
import SectionSubNav from "@/components/layouts/SectionSubNav";
import { useMobileNav } from "@/components/layouts/mobileNav";
import { PageSkeleton } from "@/components/ui/states";
import { useAuthStore } from "@/store/authStore";
import AskAiLauncher from "@/features/ai/components/AskAiLauncher";

export default function AppLayout() {
  const { pathname } = useLocation();
  const { open, setOpen } = useMobileNav();
  const mainRef = useRef<HTMLElement>(null);
  // Switching school (tenant) or branch remounts the page, so every screen - not only those whose
  // queries happen to include the scope in their keys - reloads its data, filters and forms for the new scope.
  const scopeKey = useAuthStore((s) => `${s.activeTenantId}:${s.activeBranchId}`);

  // A new scope also starts at the top of the page.
  useEffect(() => {
    mainRef.current?.scrollTo({ top: 0 });
  }, [scopeKey]);

  // Following a link in the phone drawer closes it; a new page starts at the top.
  useEffect(() => {
    setOpen(false);
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname, setOpen]);

  // Escape closes the phone drawer, and the page behind it doesn't scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  return (
    // Pinned to the window (fixed, inset 0) rather than sized with viewport units: at some browser zoom levels
    // `100dvh` doesn't match the visible window, which let the whole page scroll and pushed the header off screen.
    // Only <main> and the sidebar scroll; the document itself never does.
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>

      {/* Tablet and desktop: the sidebar sits beside the page. */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Phones: the same navigation as a slide-in drawer, so pages get the full screen width. */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-slate-950/40 cursor-default dark:bg-black/60"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
              className="absolute inset-y-0 left-0 max-w-[85vw] shadow-lg"
            >
              <Sidebar forceExpanded onClose={() => setOpen(false)} />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Header />
        {/* The pages of the section being viewed, like Talent Showcase's menu: right under the header. */}
        <SectionSubNav />
        <main id="main-content" ref={mainRef} tabIndex={-1} className="flex-1 overflow-y-auto bg-app-glow focus:outline-none">
          {/* Pages are lazy chunks: the shell stays put while the next page loads. */}
          <Suspense key={scopeKey} fallback={<PageSkeleton />}>
            <Outlet />
          </Suspense>
        </main>
      </div>
      <AskAiLauncher />
    </div>
  );
}
