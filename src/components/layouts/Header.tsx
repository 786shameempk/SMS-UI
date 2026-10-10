import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { BookOpenText, ChevronRight, CircleHelp, LifeBuoy, LogOut, Menu, Monitor, Moon, Search, ShieldCheck, Sparkles, Sun } from "lucide-react";
import toast from "react-hot-toast";
import { useAuthStore } from "@/store/authStore";
import { hasAllBranchAccess } from "@/types/auth";
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
import { useAskAi, useAskAiAvailable } from "@/features/ai/askAi";
import { BranchSwitcher, TenantSwitcher } from "./ScopeSwitchers";
import CommandMenu, { openCommandMenu } from "./CommandMenu";

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

function HelpMenu() {
  const navigate = useNavigate();
  const canUseHelpdesk = useAuthStore((s) => s.modulePermissions?.helpdesk ?? false);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Help and support"
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">Help</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={openCommandMenu}>
          <Search />
          Search pages
          <kbd className="ml-auto rounded border border-border bg-muted px-1.5 font-sans text-[10px] font-medium text-muted-foreground">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/help")}>
          <BookOpenText />
          Help Center
        </DropdownMenuItem>
        {canUseHelpdesk && (
          <DropdownMenuItem onClick={() => navigate("/helpdesk")}>
            <LifeBuoy />
            Help desk
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <p className="px-2.5 py-2 text-xs leading-5 text-muted-foreground">Something not working? Your school administrator can help with access and accounts.</p>
      </DropdownMenuContent>
    </DropdownMenu>
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
            // Only the current page below xl: the header is too busy on laptops for the section too.
            <li key={i} className={cn("flex min-w-0 items-center gap-1.5", !last && "hidden xl:flex")}>
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

/** The assistant, always one click away: same panel as the floating launcher, but where people look for actions. */
function AskAiButton() {
  const available = useAskAiAvailable();
  const open = useAskAi((s) => s.open);
  const toggle = useAskAi((s) => s.toggle);
  if (!available) return null;
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={open}
      aria-label="Ask AI"
      className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-brand-gradient px-3 text-[13px] font-semibold text-primary-foreground shadow-brand ring-1 ring-inset ring-white/25 transition-transform hover:-translate-y-px cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Sparkles className="h-4 w-4" aria-hidden="true" />
      <span className="hidden sm:inline">Ask AI</span>
    </button>
  );
}

export default function Header() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const openMobileNav = useMobileNav((s) => s.setOpen);
  const isSuperAdmin = user?.role === "superAdmin";
  const canSwitchBranch = isSuperAdmin || hasAllBranchAccess(user);

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

      {/* The page title keeps room for itself; the search and scope controls give way first. */}
      <div className="min-w-[6rem] flex-1">
        <Breadcrumbs />
      </div>

      <AskAiButton />
      <CommandMenu />

      {/* School/branch scope: header on tablet+, phone nav drawer below md. */}
      {isSuperAdmin && <TenantSwitcher className="hidden md:flex md:w-44 lg:w-56" />}
      {canSwitchBranch && <BranchSwitcher className="hidden md:flex md:w-40 lg:w-48" />}

      <div className="flex items-center gap-0.5">
        <ThemeModeToggle />
        <HelpMenu />
        <NotificationBell />
      </div>

      <div className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Account menu"
            className="flex items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 2xl:pr-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary bg-brand-gradient text-[11px] font-semibold text-primary-foreground ring-2 ring-card shadow-xs">
              {initialsOf(user?.name)}
            </div>
            <div className="hidden text-left 2xl:block">
              <p className="max-w-[140px] truncate text-[13px] font-medium leading-tight text-foreground">{user?.name ?? "User"}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{ROLE_LABEL[user?.role ?? ""] ?? user?.role}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary bg-brand-gradient text-sm font-semibold text-primary-foreground shadow-xs">
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
