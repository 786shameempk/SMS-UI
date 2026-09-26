import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { ChevronRight, LogOut, Menu, Monitor, Moon, ShieldCheck, Sun } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/useUiStore";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { ThemeMode } from "@/features/settings/theme";
import NotificationBell from "@/features/notifications/components/NotificationBell";
import { useMobileNav } from "@/components/layouts/mobileNav";
import { findNavEntry } from "@/constants/nav";
import { BranchSwitcher, TenantSwitcher } from "./ScopeSwitchers";
import CommandMenu from "./CommandMenu";

const THEME_MODE_SEQUENCE: ThemeMode[] = ["light", "dark", "system"];
const THEME_MODE_ICON: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const THEME_MODE_LABEL: Record<ThemeMode, string> = { light: "Light", dark: "Dark", system: "Match system" };

function ThemeModeToggle() {
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const Icon = THEME_MODE_ICON[themeMode];

  const cycle = () => {
    const next = THEME_MODE_SEQUENCE[(THEME_MODE_SEQUENCE.indexOf(themeMode) + 1) % THEME_MODE_SEQUENCE.length];
    setThemeMode(next);
  };

  return (
    <TooltipProvider>
      <Tooltip delayDuration={300}>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={cycle}
            aria-label={`Theme: ${THEME_MODE_LABEL[themeMode]} (click to change)`}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{THEME_MODE_LABEL[themeMode]}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function initialsOf(name: string | undefined | null) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

/** "Section › Page" for where the user is, plus a trailing crumb on detail routes (e.g. a student profile). */
function Breadcrumbs() {
  const { pathname } = useLocation();
  const entry = findNavEntry(pathname);
  if (!entry) return null;
  const isDetail = pathname !== entry.item.to && !pathname.startsWith("/talents");
  const crumbs: Array<{ label: string; to?: string }> = [];
  if (entry.section) crumbs.push({ label: entry.section.title });
  crumbs.push({ label: entry.item.label, to: isDetail ? entry.item.to : undefined });
  if (isDetail) crumbs.push({ label: "Details" });

  return (
    <nav aria-label="Breadcrumb" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((c, i) => {
          const last = i === crumbs.length - 1;
          return (
            <li key={i} className={cn("flex min-w-0 items-center gap-1.5", !last && "hidden md:flex")}>
              {c.to ? (
                <Link to={c.to} className="truncate text-muted-foreground transition-colors hover:text-foreground">
                  {c.label}
                </Link>
              ) : (
                <span className={cn("truncate", last ? "font-medium text-foreground" : "text-muted-foreground")} aria-current={last ? "page" : undefined}>
                  {c.label}
                </span>
              )}
              {!last && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

const ROLE_LABEL: Record<string, string> = {
  superAdmin: "Super admin",
  admin: "Administrator",
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  librarian: "Librarian",
  receptionist: "Receptionist",
  parent: "Parent",
  student: "Student",
};

export default function Header() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const openMobileNav = useMobileNav((s) => s.setOpen);
  const isSuperAdmin = user?.role === "superAdmin";
  const isAdmin = user?.role === "admin" || isSuperAdmin;

  const handleLogout = () => {
    clearAuth();
    toast.success("Logged out");
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:gap-3 sm:px-5">
      <button
        type="button"
        onClick={() => openMobileNav(true)}
        aria-label="Open menu"
        className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <CommandMenu />

      {/* School/branch scope: header on tablet+, phone nav drawer below md. */}
      {isSuperAdmin && <TenantSwitcher className="hidden md:flex md:w-44 xl:w-56" />}
      {isAdmin && <BranchSwitcher className="hidden md:flex md:w-40 xl:w-48" />}

      <div className="flex items-center gap-0.5">
        <ThemeModeToggle />
        <NotificationBell />
      </div>

      <div className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:pr-2.5"
          >
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground">
              {initialsOf(user?.name)}
            </div>
            <div className="hidden text-left lg:block">
              <p className="max-w-[140px] truncate text-[13px] font-medium leading-tight text-foreground">{user?.name ?? "User"}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{ROLE_LABEL[user?.role ?? ""] ?? user?.role}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initialsOf(user?.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user?.name ?? "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/account/security")}>
            <ShieldCheck />
            Security settings
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut />
            Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
