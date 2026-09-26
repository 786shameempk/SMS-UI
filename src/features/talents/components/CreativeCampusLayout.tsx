import { Suspense } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ClipboardCheck, Compass, Plus, School, Search, Sparkles, UserRound } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { getReviewQueue } from "../api";
import { MODULE_NAME } from "../constants";
import { useTalentRole } from "../hooks";
import { EmptyState } from "./Bits";
import { LoadingState } from "@/components/ui/states";
import "../talents.css";

/** Wraps every /talents route: module identity, sub-navigation, and the create entry point. */
export default function CreativeCampusLayout() {
  const { canCreate, isReviewer } = useTalentRole();
  const tenantId = useAuthStore((s) => s.activeTenantId);
  // Roles & Permissions grants this as the "module.talents" permission; the API enforces it too.
  const moduleEnabled = useAuthStore((s) => !s.modulePermissions || s.modulePermissions.talents !== false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const inComposer = pathname.startsWith("/talents/new") || pathname.endsWith("/edit");

  // Badge count for reviewers - a cheap query the review page reuses from cache.
  const { data: queue } = useQuery({
    queryKey: ["talents", "review-queue", "badge"],
    queryFn: () => getReviewQueue(),
    enabled: isReviewer && moduleEnabled,
    staleTime: 60_000,
    retry: false,
  });

  const items = [
    { to: "/talents", label: "Discover", icon: Compass, end: true },
    { to: "/talents/explore", label: "Explore", icon: Search },
    { to: `/talents/schools/${encodeURIComponent(tenantId)}`, label: "My School", icon: School },
    ...(canCreate ? [{ to: "/talents/mine", label: "My Talents", icon: UserRound }] : []),
    ...(isReviewer ? [{ to: "/talents/review", label: "Review", icon: ClipboardCheck, badge: queue?.pending }] : []),
  ];

  if (!moduleEnabled) {
    return (
      <div className="cc-root max-w-[900px] mx-auto px-4 pt-10">
        <EmptyState emoji="🔒" title="Talent Showcase isn't enabled for your role" body="Ask your school admin to grant it in Roles & Permissions, then sign in again." />
      </div>
    );
  }

  return (
    <div className="cc-root min-h-full pb-24 lg:pb-10">
      {/* Desktop sub-nav */}
      <div className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur-xl">
        <div className="max-w-[1400px] mx-auto flex items-center gap-3 px-4 sm:px-6 h-14">
          <NavLink to="/talents" className="flex items-center gap-2 shrink-0">
            <span className="w-8 h-8 rounded-xl cc-gradient-bg flex items-center justify-center shadow-md shadow-violet-900/25">
              <Sparkles className="w-4 h-4 text-white" />
            </span>
            <span className="cc-display font-bold text-foreground hidden sm:inline">{MODULE_NAME}</span>
          </NavLink>
          <nav className="hidden lg:flex items-center gap-1 ml-4" aria-label="Talent Showcase">
            {items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    "relative inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                    isActive ? "text-white" : "text-muted-foreground hover:text-foreground hover:bg-secondary",
                  )
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <motion.span layoutId="cc-nav-pill" className="absolute inset-0 rounded-full cc-gradient-bg shadow-md" transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                    <item.icon className="relative w-4 h-4" />
                    <span className="relative">{item.label}</span>
                    {!!item.badge && (
                      <span className="relative ml-0.5 min-w-5 h-5 px-1 rounded-full bg-amber-400 text-[11px] font-bold text-amber-950 flex items-center justify-center">{item.badge}</span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {canCreate && !inComposer && (
              <button
                type="button"
                onClick={() => navigate("/talents/new")}
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full cc-gradient-bg px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/25 hover:shadow-violet-900/40 hover:-translate-y-px transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                Share your talent
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Keeps the module nav on screen while a talents page chunk loads. */}
      <Suspense fallback={<LoadingState />}>
        <Outlet />
      </Suspense>

      {/* Mobile bottom bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)]" aria-label="Talent Showcase">
        <div className="flex items-stretch justify-around h-16">
          {items.slice(0, 2).map((item) => (
            <MobileTab key={item.to} {...item} />
          ))}
          {canCreate ? (
            <button type="button" onClick={() => navigate("/talents/new")} className="relative -mt-5 flex flex-col items-center cursor-pointer" aria-label="Share your talent">
              <span className="w-14 h-14 rounded-2xl cc-gradient-bg flex items-center justify-center shadow-xl shadow-violet-900/40 rotate-3">
                <Plus className="w-7 h-7 text-white -rotate-3" />
              </span>
              <span className="text-[10px] font-medium text-muted-foreground mt-0.5">Share</span>
            </button>
          ) : null}
          {items.slice(2).map((item) => (
            <MobileTab key={item.to} {...item} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function MobileTab({ to, label, icon: Icon, end, badge }: { to: string; label: string; icon: typeof Compass; end?: boolean; badge?: number }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => cn("relative flex flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-medium", isActive ? "text-violet-600 dark:text-violet-300" : "text-muted-foreground")}>
      <span className="relative">
        <Icon className="w-5 h-5" />
        {!!badge && <span className="absolute -top-1.5 -right-2.5 min-w-4 h-4 px-1 rounded-full bg-amber-400 text-[9px] font-bold text-amber-950 flex items-center justify-center">{badge}</span>}
      </span>
      {label}
    </NavLink>
  );
}
