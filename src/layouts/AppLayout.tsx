import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "@/components/layouts/Sidebar";
import Header from "@/components/layouts/Header";
import { useMobileNav } from "@/components/layouts/mobileNav";

export default function AppLayout() {
  const { pathname } = useLocation();
  const { open, setOpen } = useMobileNav();

  // Following a link in the phone drawer closes it.
  useEffect(() => setOpen(false), [pathname, setOpen]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      {/* Desktop and tablet: the sidebar sits beside the page, exactly as before. */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Phones: the same sidebar as a slide-in drawer, so pages get the full screen width. */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-black/40 cursor-default" aria-label="Close menu" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 shadow-2xl animate-in slide-in-from-left duration-200">
            <Sidebar forceExpanded />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
