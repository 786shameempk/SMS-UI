import { Banknote, Building2, GraduationCap, HeartHandshake, LayoutDashboard, Landmark, Presentation, UserPlus, Users, type LucideIcon } from "lucide-react";
import type { ModulePermissions, UserRole } from "@/types/auth";

/**
 * The dashboard's tabs. "Overview" is the customizable widget page (widgets.ts); every other tab is a fixed,
 * purpose-built view that loads its own summary. Who sees a tab follows the same rule as a widget: the role must
 * suit it, and the module(s) behind its data must be open to the viewer (the services enforce the same on the API).
 */
export type DashboardTabId = "overview" | "executive" | "finance" | "admissions" | "campus" | "engagement" | "teacher" | "hr" | "academics";

export interface DashboardTabConfig {
  id: DashboardTabId;
  label: string;
  /** One line shown under the tab bar so a new viewer knows what the page answers. */
  description: string;
  icon: LucideIcon;
  /** Roles that get the tab. Custom roles ("staff") are judged by the modules alone. */
  roles: UserRole[];
  /** The viewer needs at least one of these modules (when their grants are known). Omitted = role alone decides. */
  anyModule?: Array<keyof ModulePermissions>;
}

const LEADERS: UserRole[] = ["admin", "principal"];

export const DASHBOARD_TABS: readonly DashboardTabConfig[] = [
  { id: "overview", label: "Overview", description: "Your home page of widgets.", icon: LayoutDashboard, roles: [] },
  {
    id: "executive",
    label: "Executive",
    description: "How the school is doing at a glance: attendance, fees, results, admissions, staff and complaints, with who needs attention.",
    icon: Landmark,
    roles: LEADERS,
  },
  {
    id: "finance",
    label: "Finance",
    description: "Money in and out: collection against target, dues by age, defaulters, refunds, how people paid and payroll cost.",
    icon: Banknote,
    roles: [...LEADERS, "accountant", "staff"],
    anyModule: ["fees", "accounting", "payroll"],
  },
  {
    id: "admissions",
    label: "Admissions",
    description: "The admission funnel, seats against capacity, who is enrolled and who has left.",
    icon: UserPlus,
    roles: [...LEADERS, "receptionist", "staff"],
    anyModule: ["students"],
  },
  {
    id: "campus",
    label: "Campus operations",
    description: "Library, transport, hostel, inventory, visitors and health, with what needs action today.",
    icon: Building2,
    roles: [...LEADERS, "librarian", "receptionist", "staff"],
    anyModule: ["library", "transport", "hostel", "inventory", "visitors", "health"],
  },
  {
    id: "engagement",
    label: "Engagement",
    description: "Help desk tickets and response targets, survey results and message delivery.",
    icon: HeartHandshake,
    roles: [...LEADERS, "receptionist", "staff"],
    anyModule: ["helpdesk", "surveys", "communication"],
  },
  {
    id: "teacher",
    label: "My day",
    description: "Today's classes, attendance to mark, homework to grade, marks to enter and how your classes are doing.",
    icon: Presentation,
    roles: ["teacher"],
  },
  {
    id: "hr",
    label: "HR & Payroll",
    description: "Headcount, leave, today's staff attendance, joiners and leavers.",
    icon: Users,
    roles: [...LEADERS, "staff"],
    anyModule: ["staff", "payroll"],
  },
  {
    id: "academics",
    label: "Academics",
    description: "Results by class and subject, grades, students to celebrate and to support, and the results pipeline.",
    icon: GraduationCap,
    roles: [...LEADERS, "teacher", "staff"],
    anyModule: ["examinations", "reports"],
  },
];

export const DASHBOARD_TABS_BY_ID: ReadonlyMap<DashboardTabId, DashboardTabConfig> = new Map(DASHBOARD_TABS.map((t) => [t.id, t]));

export interface TabViewer {
  role: UserRole;
  /** Module grants from the token; null before they're known (demo sign-in), when the role rules alone apply. */
  modules?: ModulePermissions | null;
}

export function canViewTab(tab: DashboardTabConfig, viewer: TabViewer): boolean {
  if (tab.id === "overview") return true;
  if (!tab.roles.includes(viewer.role)) return false;
  if (!tab.anyModule) return true;
  // A custom role has no built-in grants: without its modules there is nothing to show.
  if (!viewer.modules) return viewer.role !== "staff";
  const modules = viewer.modules;
  return tab.anyModule.some((m) => modules[m]);
}

/** The tabs this viewer may open, in display order (always starting with Overview). */
export function availableTabs(viewer: TabViewer): DashboardTabConfig[] {
  return DASHBOARD_TABS.filter((t) => canViewTab(t, viewer));
}

/** A tab id from the address bar, or "overview" when it is unknown or not for this viewer. */
export function resolveTab(raw: string | null, viewer: TabViewer): DashboardTabId {
  const tab = DASHBOARD_TABS.find((t) => t.id === raw);
  return tab && canViewTab(tab, viewer) ? tab.id : "overview";
}
