import { NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { Mail, PanelLeftClose, PanelLeftOpen, Phone, X } from "lucide-react";
import BrandLogo from "@/components/common/BrandLogo";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { cn } from "@/utils/cn";
import { useUiStore } from "@/store/useUiStore";
import { useAuthStore } from "@/store/authStore";
import { hasAllBranchAccess } from "@/types/auth";
import type { NavItem, NavSection } from "@/constants/nav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useVisibleNav } from "./useVisibleNav";
import { isNavItemActive } from "./navMatch";
import { BranchSwitcher, TenantSwitcher } from "./ScopeSwitchers";

const W_EXPANDED = 256;
const W_COLLAPSED = 68;
const SPRING = { type: "spring" as const, bounce: 0, duration: 0.35 };

function NavItemLink({ item, isCollapsed, active }: { item: NavItem; isCollapsed: boolean; active?: boolean }) {
  const { pathname } = useLocation();
  const isActive = active ?? isNavItemActive(item, pathname);
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
          ? "bg-sidebar-accent font-semibold text-sidebar-accent-foreground shadow-xs ring-1 ring-inset ring-primary/15"
          : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-sidebar-hover-foreground",
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
          isActive ? "text-sidebar-accent-foreground" : "text-sidebar-muted group-hover:text-sidebar-hover-foreground",
        )}
        aria-hidden="true"
      />
      {!isCollapsed && <span className="truncate">{item.label}</span>}
      {!isCollapsed && item.badge && (
        <span className="ml-auto shrink-0 rounded-full bg-sidebar-foreground/15 px-1.5 py-px text-[10px] font-bold leading-4 tracking-wide text-sidebar-foreground">{item.badge}</span>
      )}
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

/** A sidebar section is one entry; its pages are the sub-menu under the header (see SectionSubNav). */
function SectionLink({ section, isCollapsed }: { section: NavSection & { items: NavItem[] }; isCollapsed: boolean }) {
  const { pathname } = useLocation();
  const active = section.items.some((item) => isNavItemActive(item, pathname));
  const entry: NavItem = { label: section.title, to: section.items[0].to, icon: section.icon };
  return <NavItemLink item={entry} isCollapsed={isCollapsed} active={active} />;
}

/** `forceExpanded`: the phone drawer always shows labels, whatever the desktop collapse preference is. */
export default function Sidebar({ forceExpanded = false, onClose }: { forceExpanded?: boolean; onClose?: () => void }) {
  const { isSidebarCollapsed: collapsedPreference, toggleSidebar } = useUiStore();
  const isSidebarCollapsed = collapsedPreference && !forceExpanded;
  const user = useAuthStore((s) => s.user);
  const isSuperAdmin = user?.role === "superAdmin";
  const canSwitchBranch = isSuperAdmin || hasAllBranchAccess(user);
  const { coreItems, sections } = useVisibleNav();
  const branding = useTenantBranding();

  return (
    <TooltipProvider>
      <motion.aside
        initial={false}
        animate={{ width: isSidebarCollapsed ? W_COLLAPSED : W_EXPANDED }}
        transition={SPRING}
        aria-label="Main navigation"
        className="flex h-full shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar"
      >
        <div className={cn("flex h-14 shrink-0 items-center border-b border-sidebar-border", isSidebarCollapsed ? "justify-center" : "gap-2.5 px-4")}>
          <BrandLogo />
          {!isSidebarCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="truncate text-[15px] font-bold leading-none tracking-tight text-sidebar-title">{branding.name}</p>
              <p className="mt-1 truncate text-[11px] leading-none text-sidebar-muted">{branding.isTenant ? "Powered by School Sphere" : "School management"}</p>
            </div>
          )}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close menu"
              className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-hover-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* The header hides the scope switchers on phones, so the drawer carries them. */}
        {forceExpanded && canSwitchBranch && (
          <div className="space-y-2 border-b border-sidebar-border p-3 md:hidden">
            {isSuperAdmin && <TenantSwitcher className="w-full" />}
            <BranchSwitcher className="w-full" />
          </div>
        )}

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 pt-3">
          <div className="space-y-0.5">
            {coreItems.map((item) => (
              <NavItemLink key={item.to} item={item} isCollapsed={isSidebarCollapsed} />
            ))}
          </div>
          <div className="mt-3 space-y-0.5 border-t border-sidebar-border pt-3">
            {sections.map((section) => (
              <SectionLink key={section.title} section={section} isCollapsed={isSidebarCollapsed} />
            ))}
          </div>
        </nav>

        {!isSidebarCollapsed && (branding.email || branding.contactNumber) && (
          <div className="shrink-0 space-y-1 border-t border-sidebar-border px-4 py-3 text-xs text-sidebar-muted" aria-label="School contact">
            {branding.email && (
              <a href={`mailto:${branding.email}`} className="flex items-center gap-2 truncate hover:text-sidebar-hover-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{branding.email}</span>
              </a>
            )}
            {branding.contactNumber && (
              <a href={`tel:${branding.contactNumber.replace(/[^+d]/g, "")}`} className="flex items-center gap-2 truncate hover:text-sidebar-hover-foreground">
                <Phone className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="truncate">{branding.contactNumber}</span>
              </a>
            )}
          </div>
        )}

        {!forceExpanded && (
          <div className={cn("flex shrink-0 border-t border-sidebar-border p-2", isSidebarCollapsed ? "justify-center" : "justify-end")}>
            <Tooltip delayDuration={300}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={toggleSidebar}
                  aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                  className="flex h-8 w-8 items-center justify-center rounded-md text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-sidebar-hover-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
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
