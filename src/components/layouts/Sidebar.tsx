import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronDown, GraduationCap, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { cn } from "@/utils/cn";
import { useUiStore } from "@/store/useUiStore";
import { useAuthStore } from "@/store/authStore";
import type { NavItem } from "@/constants/nav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useVisibleNav } from "./useVisibleNav";
import { BranchSwitcher, TenantSwitcher } from "./ScopeSwitchers";

const W_EXPANDED = 256;
const W_COLLAPSED = 68;
const SPRING = { type: "spring" as const, bounce: 0, duration: 0.35 };

function isItemActive(item: NavItem, pathname: string) {
  return item.end ? pathname === item.to : pathname === item.to || pathname.startsWith(item.to + "/");
}

function NavItemLink({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  const { pathname } = useLocation();
  const isActive = isItemActive(item, pathname);
  const reduceMotion = useReducedMotion();

  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      aria-label={isCollapsed ? item.label : undefined}
      className={cn(
        "group relative flex items-center rounded-lg text-[13.5px] font-medium transition-colors duration-150 select-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        isCollapsed ? "mx-auto h-10 w-10 justify-center" : "h-9 gap-3 px-2.5",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {isActive && !isCollapsed && (
        <motion.span
          layoutId={reduceMotion ? undefined : "nav-accent-bar"}
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-primary"
          transition={SPRING}
        />
      )}
      <item.icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          isActive ? "text-sidebar-accent-foreground" : "text-muted-foreground group-hover:text-foreground",
        )}
        aria-hidden="true"
      />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
    </NavLink>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={150}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

function ExpandedNavSection({ title, items }: { title: string; items: NavItem[] }) {
  const { pathname } = useLocation();
  const isSectionCollapsed = useUiStore((s) => s.collapsedNavSections.includes(title));
  const toggleNavSection = useUiStore((s) => s.toggleNavSection);
  const expandNavSection = useUiStore((s) => s.expandNavSection);
  const isOpen = !isSectionCollapsed;
  const containsActive = items.some((item) => isItemActive(item, pathname));
  const sectionId = `nav-section-${title.replace(/\W+/g, "-").toLowerCase()}`;

  // Navigating into a collapsed section (e.g. via a link elsewhere) reveals it, so the active item is never hidden.
  useEffect(() => {
    if (containsActive) expandNavSection(title);
  }, [containsActive, pathname, title, expandNavSection]);

  return (
    <div className="pt-4">
      <button
        type="button"
        onClick={() => toggleNavSection(title)}
        aria-expanded={isOpen}
        aria-controls={sectionId}
        className="group flex h-7 w-full items-center gap-2 rounded-md px-2.5 text-left cursor-pointer hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/90 group-hover:text-foreground">{title}</span>
        <ChevronDown
          className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200", !isOpen && "-rotate-90")}
          aria-hidden="true"
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={sectionId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="mt-0.5 space-y-0.5 overflow-hidden"
          >
            {items.map((item) => (
              <NavItemLink key={item.to} item={item} isCollapsed={false} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** `forceExpanded`: the phone drawer always shows labels, whatever the desktop collapse preference is. */
export default function Sidebar({ forceExpanded = false, onClose }: { forceExpanded?: boolean; onClose?: () => void }) {
  const { isSidebarCollapsed: collapsedPreference, toggleSidebar } = useUiStore();
  const isSidebarCollapsed = collapsedPreference && !forceExpanded;
  const role = useAuthStore((s) => s.user?.role);
  const { coreItems, sections } = useVisibleNav();

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? W_COLLAPSED : W_EXPANDED }}
        transition={SPRING}
        aria-label="Main navigation"
        className="flex h-dvh shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar"
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b border-sidebar-border", isSidebarCollapsed ? "justify-center" : "gap-2.5 px-4")}>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
            <GraduationCap className="h-[18px] w-[18px]" aria-hidden="true" />
          </div>
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-none tracking-tight text-foreground">EduCore</p>
              <p className="mt-1 truncate text-[11px] leading-none text-muted-foreground">School management</p>
            </div>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* The header hides the scope switchers on phones, so the drawer carries them. */}
        {forceExpanded && (role === "admin" || role === "superAdmin") && (
          <div className="space-y-2 border-b border-sidebar-border p-3 md:hidden">
            {role === "superAdmin" && <TenantSwitcher className="w-full" />}
            <BranchSwitcher className="w-full" />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-3">
          <div className="space-y-0.5">
            {coreItems.map((item) => (
              <NavItemLink key={item.to} item={item} isCollapsed={isSidebarCollapsed} />
            ))}
          </div>
          {sections.map((section) =>
            isSidebarCollapsed ? (
              <div key={section.title} className="space-y-0.5">
                <div className="mx-3 my-3 h-px bg-sidebar-border" role="separator" />
                {section.items.map((item) => (
                  <NavItemLink key={item.to} item={item} isCollapsed />
                ))}
              </div>
            ) : (
              <ExpandedNavSection key={section.title} title={section.title} items={section.items} />
            ),
          )}
        </nav>

        {!forceExpanded && (
          <div className={cn("flex shrink-0 border-t border-sidebar-border p-2", isSidebarCollapsed ? "justify-center" : "justify-end")}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {isSidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                </button>
              </TooltipTrigger>
              <TooltipContent side="right">{isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}</TooltipContent>
            </Tooltip>
          </div>
        )}
      </motion.aside>
    </TooltipProvider>
  );
}
