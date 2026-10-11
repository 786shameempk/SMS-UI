import { useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { LogOut, Menu, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/utils/cn";
import { useOfficeStore } from "../store";
import { visibleNav } from "../navigation";
import { OFFICE_PAGE_PATHS } from "../pages/registry";

/**
 * Guards the office area and gives it its own shell. It reads only the office session: a school login (any role) is
 * invisible here, so a school Administrator is simply "not signed in" to the office portal.
 */
export function OfficeGuard({ children }: { children: React.ReactNode }) {
  const status = useOfficeStore((s) => s.status);
  const restore = useOfficeStore((s) => s.restore);
  const location = useLocation();
  useEffect(() => {
    void restore();
  }, [restore]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" aria-busy="true" aria-label="Restoring your session">
        <Skeleton className="h-10 w-48 rounded-lg" />
      </div>
    );
  }
  if (status === "signedOut") return <Navigate to="/adminLogin" replace state={{ from: location.pathname }} />;
  return <>{children}</>;
}

export default function OfficeLayout() {
  const user = useOfficeStore((s) => s.user)!;
  const signOut = useOfficeStore((s) => s.signOut);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // The drawer is open for one page only: navigating (even to the same link) closes it.
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;
  const setOpen = (value: boolean) => setOpenAt(value ? pathname : null);
  const nav = visibleNav(user.permissions, OFFICE_PAGE_PATHS);

  const logout = async () => {
    await signOut();
    navigate("/adminLogin", { replace: true });
  };

  const menu = (
    <nav aria-label="Office navigation" className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
      {nav.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={`/office/${to}`}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive ? "bg-white/15 text-white" : "text-white/70 hover:bg-white/10 hover:text-white",
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="fixed inset-0 flex overflow-hidden bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-slate-900 text-white lg:flex">
        <div className="flex items-center gap-2 px-5 py-4">
          <ShieldCheck className="h-6 w-6 text-amber-400" aria-hidden="true" />
          <div>
            <p className="text-sm font-semibold leading-tight">School Sphere</p>
            <p className="text-[11px] uppercase tracking-wider text-white/60">Office portal</p>
          </div>
        </div>
        {menu}
      </aside>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Office navigation">
          <button type="button" className="absolute inset-0 bg-slate-950/50" aria-label="Close menu" onClick={() => setOpen(false)} />
          <aside className="relative flex h-full w-72 max-w-[85%] flex-col bg-slate-900 text-white">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-semibold">School Sphere · Office</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close menu" className="rounded-md p-1 hover:bg-white/10">
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {menu}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-card px-4">
          <Button variant="ghost" size="sm" className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1" />
          <div className="hidden min-w-0 text-right sm:block">
            <p className="truncate text-sm font-medium text-foreground">{user.displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user.role}</p>
          </div>
          <Button variant="outline" size="sm" onClick={logout} className="gap-2">
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Sign out
          </Button>
        </header>
        <main id="office-main" className="min-h-0 flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

/** /office lands on the first screen this user may open. */
export function OfficeHome() {
  const user = useOfficeStore((s) => s.user)!;
  const first = visibleNav(user.permissions, OFFICE_PAGE_PATHS)[0];
  return <Navigate to={`/office/${first?.to ?? "security"}`} replace />;
}
