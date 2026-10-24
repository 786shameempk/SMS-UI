import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/utils/cn";
import { BookOpenText, ChevronRight, CircleHelp, LifeBuoy, LogOut, Menu, Monitor, Moon, QrCode, Search, ShieldCheck, Sun } from "lucide-react";
import { LanguageMenu } from "@/i18n/LanguageMenu";
import { useTranslation } from "react-i18next";
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
import { BranchSwitcher, TenantSwitcher } from "./ScopeSwitchers";
import CommandMenu, { openCommandMenu } from "./CommandMenu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { useAttendanceQueue } from "@/features/attendance/offline/hooks";

const THEME_MODE_SEQUENCE: ThemeMode[] = ["light", "dark", "system"];
const THEME_MODE_ICON: Record<ThemeMode, typeof Sun> = { light: Sun, dark: Moon, system: Monitor };
const THEME_MODE_LABEL: Record<ThemeMode, string> = { light: "Light", dark: "Dark", system: "Match system" };

function ThemeModeToggle() {
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const Icon = THEME_MODE_ICON[themeMode];
  const { t } = useTranslation("common");

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
            aria-label={t("Theme: {{mode}} (click to change)", { mode: t(THEME_MODE_LABEL[themeMode]) })}
            className="flex items-center justify-center w-9 h-9 rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon className="w-4 h-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">{t(THEME_MODE_LABEL[themeMode])}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function ThemeModeMenuItem() {
  const themeMode = useUiStore((s) => s.themeMode);
  const setThemeMode = useUiStore((s) => s.setThemeMode);
  const Icon = THEME_MODE_ICON[themeMode];
  const next = THEME_MODE_SEQUENCE[(THEME_MODE_SEQUENCE.indexOf(themeMode) + 1) % THEME_MODE_SEQUENCE.length];
  const { t } = useTranslation("common");

  return (
    // Keep the menu open so the new theme is visible straight away.
    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setThemeMode(next); }}>
      <Icon />
      {t("Theme")}
      <span className="ms-auto text-xs text-muted-foreground">{t(THEME_MODE_LABEL[themeMode])}</span>
    </DropdownMenuItem>
  );
}

function HelpMenu() {
  const navigate = useNavigate();
  const canUseHelpdesk = useAuthStore((s) => s.modulePermissions?.helpdesk ?? false);
  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
  const { t } = useTranslation("common");

  return (
    <DropdownMenu>
      <TooltipProvider>
        <Tooltip delayDuration={300}>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label={t("Help and support")}
                className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <CircleHelp className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom">{t("Help")}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuItem onClick={openCommandMenu}>
          <Search />
          {t("Search pages")}
          <kbd className="ms-auto rounded border border-border bg-muted px-1.5 font-sans text-[10px] font-medium text-muted-foreground">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/help")}>
          <BookOpenText />
          {t("Help Center")}
        </DropdownMenuItem>
        {canUseHelpdesk && (
          <DropdownMenuItem onClick={() => navigate("/helpdesk")}>
            <LifeBuoy />
            {t("Help desk")}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <p className="px-2.5 py-2 text-xs leading-5 text-muted-foreground">{t("Something not working? Your school administrator can help with access and accounts.")}</p>
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
  const { t } = useTranslation("nav");
  const { t: tc } = useTranslation("common");
  const entry = findNavEntry(pathname);
  if (!entry) return null;
  const isDetail = pathname !== entry.item.to && !pathname.startsWith("/talents");
  const crumbs: Array<{ label: string; to?: string }> = [];
  if (entry.section) crumbs.push({ label: t(entry.section.title) });
  crumbs.push({ label: t(entry.item.label), to: isDetail ? entry.item.to : undefined });
  if (isDetail) crumbs.push({ label: t("Details") });

  return (
    <nav aria-label={tc("Breadcrumb")} className="min-w-0">
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

export default function Header() {
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();
  const openMobileNav = useMobileNav((s) => s.setOpen);
  const isSuperAdmin = user?.role === "superAdmin";
  const canSwitchBranch = isSuperAdmin || hasAllBranchAccess(user);
  const { t } = useTranslation("common");

  // Registers saved on this device while offline are deleted when someone signs out on purpose, so ask first.
  const unsentRegisters = useAttendanceQueue().open.length;
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const signOut = () => {
    clearAuth();
    toast.success(t("Logged out"));
    navigate("/login", { replace: true });
  };
  const handleLogout = () => (unsentRegisters > 0 ? setConfirmingLogout(true) : signOut());

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-border bg-card/90 px-3 backdrop-blur supports-[backdrop-filter]:bg-card/75 sm:gap-3 sm:px-5">
      <button
        type="button"
        onClick={() => openMobileNav(true)}
        aria-label={t("Open menu")}
        className="md:hidden flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
      >
        <Menu className="h-5 w-5" />
      </button>

      {/* The page title keeps room for itself; the search and scope controls give way first. */}
      <div className="min-w-0 flex-1">
        <Breadcrumbs />
      </div>

      <CommandMenu />

      {/* School/branch scope: header on tablet+, phone nav drawer below md. */}
      {isSuperAdmin && <TenantSwitcher className="hidden md:flex md:w-44 lg:w-56" />}
      {canSwitchBranch && <BranchSwitcher className="hidden md:flex md:w-40 lg:w-48" />}

      <div className="flex shrink-0 items-center gap-0.5">
        {/* Phones are tight: the theme toggle moves to Settings there so the account button is never pushed off screen. */}
        <div className="hidden sm:block">
          <ThemeModeToggle />
        </div>
        <HelpMenu />
        <NotificationBell />
      </div>

      <div className="mx-0.5 hidden h-6 w-px bg-border sm:block" aria-hidden="true" />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={t("Account menu")}
            className="flex shrink-0 items-center gap-2.5 rounded-lg p-1 transition-colors hover:bg-secondary cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring 2xl:pe-2.5"
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary bg-brand-gradient text-[11px] font-semibold text-primary-foreground ring-2 ring-card shadow-xs">
              {initialsOf(user?.name)}
            </div>
            <div className="hidden text-start 2xl:block">
              <p className="max-w-[140px] truncate text-[13px] font-medium leading-tight text-foreground">{user?.name ?? t("User")}</p>
              <p className="text-[11px] leading-tight text-muted-foreground">{ROLE_LABEL[user?.role ?? ""] ? t(ROLE_LABEL[user?.role ?? ""]) : user?.role}</p>
            </div>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary bg-brand-gradient text-sm font-semibold text-primary-foreground shadow-xs">
              {initialsOf(user?.name)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{user?.name ?? t("User")}</p>
              <p className="truncate text-xs text-muted-foreground">{user?.email ?? ""}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          {/* Phones: the header toggle is hidden for space, so the theme lives here. */}
          <div className="sm:hidden">
            <ThemeModeMenuItem />
            <DropdownMenuSeparator />
          </div>
          <LanguageMenu />
          {user?.role !== "parent" && user?.role !== "superAdmin" && (
            <DropdownMenuItem onClick={() => navigate("/account/attendance-pass")}>
              <QrCode />
              {t("My attendance pass")}
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => navigate("/account/security")}>
            <ShieldCheck />
            {t("Security settings")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={handleLogout}>
            <LogOut />
            {t("Log out")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ConfirmDialog
        open={confirmingLogout}
        onOpenChange={setConfirmingLogout}
        title={t("Attendance not sent yet")}
        description={t("Attendance saved on this device hasn't reached the school yet ({{count}} waiting). Signing out deletes it. Go online and wait for it to be sent first.", { count: unsentRegisters })}
        confirmLabel={t("Sign out anyway")}
        confirmVariant="destructive"
        onConfirm={signOut}
      />
    </header>
  );
}
