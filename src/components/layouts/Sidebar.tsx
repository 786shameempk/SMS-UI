import { useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GraduationCap, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/utils/cn";
import { useUiStore } from "@/store/useUiStore";
import { useAuthStore } from "@/store/authStore";
import { CORE_NAV_ITEMS, NAV_SECTIONS, type NavItem } from "@/constants/nav";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const W_EXPANDED = 260;
const W_COLLAPSED = 72;
const SPRING = { type: "spring" as const, bounce: 0, duration: 0.4 };

function NavItemLink({ item, isCollapsed }: { item: NavItem; isCollapsed: boolean }) {
  const { pathname } = useLocation();
  const isActive = item.end ? pathname === item.to : pathname.startsWith(item.to);

  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      className={cn(
        "relative flex items-center rounded-lg transition-colors duration-150 select-none",
        isCollapsed ? "h-10 w-10 justify-center mx-auto" : "h-9 gap-3 px-3",
        isActive
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      {isActive && !isCollapsed && (
        <motion.span
          layoutId="nav-accent-bar"
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[2.5px] h-5 rounded-r-full bg-brand-500"
          transition={SPRING}
        />
      )}
      <item.icon
        style={{ width: 15, height: 15 }}
        className={cn("relative z-10 shrink-0", isActive && "text-sidebar-accent-foreground")}
      />
      {!isCollapsed && <span className="relative z-10 text-[13px] font-medium whitespace-nowrap">{item.label}</span>}
    </NavLink>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={250}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

function NavSectionBlock({ title, items, isCollapsed }: { title: string; items: NavItem[]; isCollapsed: boolean }) {
  if (isCollapsed) {
    return (
      <div className="space-y-0.5">
        <div className="mx-3 my-1.5 h-px bg-border" />
        {items.map((item) => (
          <NavItemLink key={item.to} item={item} isCollapsed />
        ))}
      </div>
    );
  }

  return <ExpandedNavSection title={title} items={items} />;
}

function ExpandedNavSection({ title, items }: { title: string; items: NavItem[] }) {
  const { pathname } = useLocation();
  const isCollapsible = items.length > 1;
  const isSectionCollapsed = useUiStore((s) => s.collapsedNavSections.includes(title));
  const toggleNavSection = useUiStore((s) => s.toggleNavSection);
  const expandNavSection = useUiStore((s) => s.expandNavSection);
  const isOpen = !isCollapsible || !isSectionCollapsed;
  const containsActive = items.some((item) => (item.end ? pathname === item.to : pathname.startsWith(item.to)));

  // Navigating into a collapsed section (e.g. via a link elsewhere) reveals it, so the active item is never hidden.
  useEffect(() => {
    if (containsActive) expandNavSection(title);
  }, [containsActive, pathname, title, expandNavSection]);

  const titleLabel = (
    <span className="flex-1 text-left text-[10px] font-bold uppercase tracking-[0.13em] text-muted-foreground">{title}</span>
  );

  return (
    <div className="space-y-0.5">
      {isCollapsible ? (
        <button
          type="button"
          onClick={() => toggleNavSection(title)}
          aria-expanded={isOpen}
          className="flex w-full items-center gap-2 px-3 h-7 rounded-md hover:bg-secondary transition-colors duration-150 cursor-pointer"
        >
          {titleLabel}
          <ChevronDown
            style={{ width: 13, height: 13 }}
            className={cn("shrink-0 text-muted-foreground transition-transform duration-200", !isOpen && "-rotate-90")}
          />
        </button>
      ) : (
        <div className="flex items-center gap-2 px-3 h-7">{titleLabel}</div>
      )}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="space-y-0.5 overflow-hidden"
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

export default function Sidebar() {
  const { isSidebarCollapsed, toggleSidebar } = useUiStore();
  const modulePermissions = useAuthStore((s) => s.modulePermissions);

  const hasPermission = (key?: NavItem["permissionKey"]) => !key || !modulePermissions || modulePermissions[key];
  const visibleCoreItems = CORE_NAV_ITEMS.filter((item) => hasPermission(item.permissionKey));
  const visibleSections = NAV_SECTIONS.filter((section) => hasPermission(section.permissionKey)).map((section) => ({
    ...section,
    items: section.items.filter((item) => hasPermission(item.permissionKey)),
  }));

  return (
    <TooltipProvider>
      <motion.aside
        animate={{ width: isSidebarCollapsed ? W_COLLAPSED : W_EXPANDED }}
        transition={SPRING}
        className="flex flex-col h-screen shrink-0 overflow-hidden bg-sidebar border-r border-sidebar-border"
      >
        <div className={cn("flex items-center shrink-0 overflow-hidden", isSidebarCollapsed ? "justify-center h-[60px]" : "gap-3 px-5 h-[60px]")}>
          <div
            className="w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0"
            style={{ background: "linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)" }}
          >
            <GraduationCap className="w-4 h-4 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <div className="overflow-hidden">
              <p className="text-[15px] font-extrabold tracking-tight text-foreground leading-none whitespace-nowrap">EduCore</p>
              <p className="text-[10px] font-medium mt-0.5 text-muted-foreground whitespace-nowrap">Management Suite</p>
            </div>
          )}
        </div>
        <div className="mx-4 shrink-0 h-px bg-sidebar-border" />

        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-3 space-y-0.5">
          {visibleCoreItems.map((item) => (
            <NavItemLink key={item.to} item={item} isCollapsed={isSidebarCollapsed} />
          ))}
          {visibleSections.map((section) => (
            <div key={section.title}>
              <div className="h-2" />
              <NavSectionBlock title={section.title} items={section.items} isCollapsed={isSidebarCollapsed} />
            </div>
          ))}
        </nav>

        <div className={cn("shrink-0 flex px-3 py-2", isSidebarCollapsed ? "justify-center" : "justify-end")}>
          <Tooltip delayDuration={400}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={toggleSidebar}
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors duration-150 cursor-pointer"
              >
                {isSidebarCollapsed ? <PanelLeftOpen style={{ width: 14, height: 14 }} /> : <PanelLeftClose style={{ width: 14, height: 14 }} />}
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">{isSidebarCollapsed ? "Expand" : "Collapse"}</TooltipContent>
          </Tooltip>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
