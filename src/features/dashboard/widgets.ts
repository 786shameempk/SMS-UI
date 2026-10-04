import {
  Activity,
  BarChart3,
  Bell,
  BookMarked,
  Building2,
  Bus,
  CakeSlice,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  Clock,
  FileCheck,
  Gauge,
  Palmtree,
  Wallet,
  Zap,
  BedDouble,
  PieChart,
  ShieldAlert,
  Table2,
  Trophy,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import type { ModulePermissions, UserRole } from "@/types/auth";
import type { WidgetDataKey } from "./sources/types";

/**
 * The dashboard widget catalog: one strongly typed config per widget. Everything else (who may see it,
 * the default dashboard, the layout a user saves, the admin screen) is derived from this list, so a new
 * widget is one entry here plus one renderer in registry.tsx.
 *
 * Visibility here is a convenience, not the security boundary: every loader calls the service APIs as the
 * signed-in user, and those enforce the role, the module permission and the tenant on the server.
 */

export type DashboardWidgetId =
  | "stats"
  | "scopeOverview"
  | "quickActions"
  | "performance"
  | "revenue"
  | "attendance"
  | "calendar"
  | "birthdays"
  | "holidays"
  | "todayClasses"
  | "upcomingExams"
  | "pendingAssignments"
  | "feesDue"
  | "libraryDue"
  | "busStatus"
  | "hostel"
  | "recentActivity"
  | "notifications"
  | "schools"
  | "alerts"
  | "learnerAttendance"
  | "feeStatus"
  | "classAttendance"
  | "topPerformers"
  | "feeDefaulters";

/** The visual building block a widget is drawn with. */
export type WidgetType =
  | "kpi"
  | "lineChart"
  | "barChart"
  | "areaChart"
  | "doughnutChart"
  | "progress"
  | "table"
  | "timeline"
  | "calendar"
  | "alert"
  | "quickAction"
  | "list"
  | "ranking"
  | "statusSummary";

export type WidgetCategory = "overview" | "academics" | "finance" | "campus" | "calendar" | "communication";

export const WIDGET_CATEGORY_LABEL: Record<WidgetCategory, string> = {
  overview: "Overview",
  academics: "Academics",
  finance: "Finance",
  campus: "Campus",
  calendar: "Calendar & people",
  communication: "Communication",
};

/** Width in columns of the 12-column desktop grid (tablets halve it, phones stack everything). */
export type WidgetWidth = 3 | 4 | 6 | 8 | 12;
/** Height in grid rows; a hint (minimum height) - cards in one row stretch to the tallest. */
export type WidgetHeight = 1 | 2 | 3;

export const WIDGET_WIDTHS: readonly WidgetWidth[] = [3, 4, 6, 8, 12];
export const WIDGET_HEIGHTS: readonly WidgetHeight[] = [1, 2, 3];

/** Where a widget's data comes from. */
export type WidgetDataSourceRef =
  /** One of the per-widget loaders every data source (live API, demo) implements. */
  | { kind: "loader"; key: WidgetDataKey }
  /** The branch roll-up, which follows the Aggregated / Segregated switch. */
  | { kind: "scope" }
  /** No data to fetch (shortcuts built from the user's role and permissions). */
  | { kind: "static" };

export interface DashboardWidgetConfig {
  id: DashboardWidgetId;
  name: string;
  description: string;
  type: WidgetType;
  icon: LucideIcon;
  category: WidgetCategory;
  /** Omitted = every role. */
  allowedRoles?: UserRole[];
  /** Module the viewer must be able to open (its API refuses the data otherwise). */
  requiredPermission?: keyof ModulePermissions;
  /** Roles that get the widget without that module because it shows only their own records (a parent's fees). */
  permissionExemptRoles?: UserRole[];
  /** Only for users whose role covers every branch. */
  allBranchesOnly?: boolean;
  defaultVisible: boolean;
  defaultOrder: number;
  defaultWidth: WidgetWidth;
  defaultHeight: WidgetHeight;
  /** Whether users may hide, move and resize it. Fixed widgets always show at their default place and size. */
  configurable: boolean;
  /** Seconds between background refreshes while the dashboard is open; 0 = only on load / manual refresh. */
  refreshInterval: number;
  dataSource: WidgetDataSourceRef;
}

const FINANCE_ROLES: UserRole[] = ["admin", "superAdmin", "principal", "accountant"];
/** Everyone except students and parents, who never see school-wide people data. */
const STAFF_ROLES: UserRole[] = ["admin", "superAdmin", "principal", "teacher", "accountant", "librarian", "receptionist", "staff"];
/** Roles with a personal timetable: the teacher's own periods, or the learner's section. */
const TIMETABLE_ROLES: UserRole[] = ["teacher", "student", "parent"];
/** The audit log is a leadership view. */
const LEADERSHIP_ROLES: UserRole[] = ["admin", "superAdmin", "principal"];
/** Parents and students see only their own (or their children's) records, which the services scope for them. */
const SELF_SERVICE: UserRole[] = ["parent", "student"];

const loader = (key: WidgetDataKey): WidgetDataSourceRef => ({ kind: "loader", key });

export const WIDGET_CATALOG: readonly DashboardWidgetConfig[] = [
  {
    id: "schools", name: "Schools overview", description: "Every school on the platform: status, plan and headcount.",
    type: "table", icon: Building2, category: "overview", allowedRoles: ["superAdmin"], requiredPermission: "platformConsole",
    defaultVisible: true, defaultOrder: 15, defaultWidth: 12, defaultHeight: 1, configurable: true, refreshInterval: 300,
    dataSource: loader("schools"),
  },
  {
    id: "stats", name: "Key stats", description: "Headline numbers for your role.",
    type: "kpi", icon: Gauge, category: "overview",
    defaultVisible: true, defaultOrder: 10, defaultWidth: 12, defaultHeight: 1, configurable: true, refreshInterval: 300,
    dataSource: loader("stats"),
  },
  {
    id: "scopeOverview", name: "Branch overview", description: "Students, staff and fees - all branches combined, or the selected branch.",
    type: "statusSummary", icon: Building2, category: "overview", allBranchesOnly: true,
    defaultVisible: true, defaultOrder: 20, defaultWidth: 12, defaultHeight: 1, configurable: true, refreshInterval: 0,
    dataSource: { kind: "scope" },
  },
  {
    id: "alerts", name: "Needs attention", description: "Overdue fees, low or unmarked attendance and staff on leave, in one place.",
    type: "alert", icon: ShieldAlert, category: "overview", allowedRoles: LEADERSHIP_ROLES,
    defaultVisible: true, defaultOrder: 25, defaultWidth: 12, defaultHeight: 1, configurable: true, refreshInterval: 300,
    dataSource: loader("alerts"),
  },
  {
    id: "attendance", name: "Attendance summary", description: "Today's present, absent, late and on-leave split.",
    type: "progress", icon: CalendarCheck, category: "academics", requiredPermission: "attendance", permissionExemptRoles: SELF_SERVICE,
    defaultVisible: true, defaultOrder: 30, defaultWidth: 8, defaultHeight: 1, configurable: true, refreshInterval: 300,
    dataSource: loader("attendance"),
  },
  {
    id: "quickActions", name: "Quick actions", description: "Shortcuts to the tasks you do most.",
    type: "quickAction", icon: Zap, category: "overview",
    defaultVisible: true, defaultOrder: 40, defaultWidth: 4, defaultHeight: 1, configurable: true, refreshInterval: 0,
    dataSource: { kind: "static" },
  },
  {
    id: "learnerAttendance", name: "Attendance (30 days)", description: "Present, late, absent and leave days for you or each child.",
    type: "progress", icon: UserCheck, category: "academics", allowedRoles: SELF_SERVICE,
    defaultVisible: true, defaultOrder: 45, defaultWidth: 4, defaultHeight: 1, configurable: true, refreshInterval: 0,
    dataSource: loader("learnerAttendance"),
  },
  {
    id: "performance", name: "Academic performance", description: "Average score and pass rate trend.",
    type: "lineChart", icon: BarChart3, category: "academics", requiredPermission: "examinations", permissionExemptRoles: SELF_SERVICE,
    defaultVisible: true, defaultOrder: 50, defaultWidth: 8, defaultHeight: 2, configurable: true, refreshInterval: 0,
    dataSource: loader("performanceTrend"),
  },
  {
    id: "calendar", name: "Calendar", description: "Month view with exams, holidays and events.",
    type: "calendar", icon: CalendarDays, category: "calendar",
    defaultVisible: true, defaultOrder: 60, defaultWidth: 4, defaultHeight: 2, configurable: true, refreshInterval: 0,
    dataSource: loader("calendarEvents"),
  },
  {
    id: "revenue", name: "Fee revenue", description: "Collected vs. expected fees per month.",
    type: "barChart", icon: Wallet, category: "finance", allowedRoles: FINANCE_ROLES, requiredPermission: "fees",
    defaultVisible: true, defaultOrder: 70, defaultWidth: 8, defaultHeight: 2, configurable: true, refreshInterval: 0,
    dataSource: loader("revenueTrend"),
  },
  {
    id: "feeStatus", name: "Fee collection status", description: "Paid, partly paid, due and overdue invoices as a share of the total.",
    type: "doughnutChart", icon: PieChart, category: "finance", allowedRoles: FINANCE_ROLES, requiredPermission: "fees",
    defaultVisible: true, defaultOrder: 75, defaultWidth: 4, defaultHeight: 2, configurable: true, refreshInterval: 300,
    dataSource: loader("feeStatus"),
  },
  {
    id: "birthdays", name: "Birthdays", description: "Student and staff birthdays this week.",
    type: "list", icon: CakeSlice, category: "calendar", allowedRoles: STAFF_ROLES,
    defaultVisible: true, defaultOrder: 80, defaultWidth: 4, defaultHeight: 1, configurable: true, refreshInterval: 0,
    dataSource: loader("birthdays"),
  },
  {
    id: "holidays", name: "Holidays", description: "Upcoming public and school holidays.",
    type: "list", icon: Palmtree, category: "calendar",
    defaultVisible: true, defaultOrder: 90, defaultWidth: 4, defaultHeight: 1, configurable: true, refreshInterval: 0,
    dataSource: loader("holidays"),
  },
  {
    id: "todayClasses", name: "Today's classes", description: "Timetable for today.",
    type: "timeline", icon: Clock, category: "academics", allowedRoles: TIMETABLE_ROLES, requiredPermission: "timetable",
    defaultVisible: true, defaultOrder: 100, defaultWidth: 4, defaultHeight: 1, configurable: true, refreshInterval: 600,
    dataSource: loader("todayClasses"),
  },
  {
    id: "classAttendance", name: "Class-wise attendance", description: "Today's attendance by section, best first.",
    type: "ranking", icon: CalendarCheck, category: "academics", allowedRoles: [...LEADERSHIP_ROLES, "teacher"], requiredPermission: "attendance",
    defaultVisible: true, defaultOrder: 105, defaultWidth: 4, defaultHeight: 2, configurable: true, refreshInterval: 300,
    dataSource: loader("classAttendance"),
  },
  {
    id: "upcomingExams", name: "Upcoming exams", description: "Next scheduled exam papers.",
    type: "list", icon: FileCheck, category: "academics", requiredPermission: "examinations", permissionExemptRoles: SELF_SERVICE,
    defaultVisible: true, defaultOrder: 110, defaultWidth: 4, defaultHeight: 1, configurable: true, refreshInterval: 0,
    dataSource: loader("upcomingExams"),
  },
  {
    id: "pendingAssignments", name: "Pending assignments", description: "Homework due soon and submission progress.",
    type: "progress", icon: ClipboardList, category: "academics", requiredPermission: "homework", permissionExemptRoles: SELF_SERVICE,
    defaultVisible: true, defaultOrder: 120, defaultWidth: 4, defaultHeight: 1, configurable: true, refreshInterval: 600,
    dataSource: loader("pendingAssignments"),
  },
  {
    id: "topPerformers", name: "Top performers", description: "Students with the highest average exam score in the period.",
    type: "ranking", icon: Trophy, category: "academics", allowedRoles: LEADERSHIP_ROLES, requiredPermission: "examinations",
    defaultVisible: true, defaultOrder: 125, defaultWidth: 4, defaultHeight: 1, configurable: true, refreshInterval: 0,
    dataSource: loader("topPerformers"),
  },
  {
    id: "recentActivity", name: "Recent activity", description: "Latest actions across the school.",
    type: "timeline", icon: Activity, category: "overview", allowedRoles: LEADERSHIP_ROLES,
    defaultVisible: true, defaultOrder: 130, defaultWidth: 8, defaultHeight: 1, configurable: true, refreshInterval: 120,
    dataSource: loader("recentActivity"),
  },
  {
    id: "notifications", name: "Notifications", description: "Recent announcements and reminders.",
    type: "list", icon: Bell, category: "communication",
    defaultVisible: true, defaultOrder: 140, defaultWidth: 4, defaultHeight: 1, configurable: true, refreshInterval: 60,
    dataSource: loader("notifications"),
  },
  {
    id: "feesDue", name: "Fees due", description: "Outstanding and overdue invoices.",
    type: "table", icon: Wallet, category: "finance", requiredPermission: "fees", permissionExemptRoles: SELF_SERVICE,
    defaultVisible: true, defaultOrder: 150, defaultWidth: 3, defaultHeight: 1, configurable: true, refreshInterval: 300,
    dataSource: loader("feesDue"),
  },
  {
    id: "feeDefaulters", name: "Fee defaulters", description: "Students with the largest past-due balances.",
    type: "table", icon: Table2, category: "finance", allowedRoles: FINANCE_ROLES, requiredPermission: "fees",
    defaultVisible: true, defaultOrder: 155, defaultWidth: 6, defaultHeight: 1, configurable: true, refreshInterval: 300,
    dataSource: loader("feeDefaulters"),
  },
  {
    id: "libraryDue", name: "Library due books", description: "Loans overdue or due in the next 3 days.",
    type: "list", icon: BookMarked, category: "campus", requiredPermission: "library",
    defaultVisible: true, defaultOrder: 160, defaultWidth: 3, defaultHeight: 1, configurable: true, refreshInterval: 0,
    dataSource: loader("libraryDue"),
  },
  {
    id: "busStatus", name: "Bus status", description: "Live fleet status or your child's bus.",
    type: "statusSummary", icon: Bus, category: "campus", requiredPermission: "transport", permissionExemptRoles: SELF_SERVICE,
    defaultVisible: true, defaultOrder: 170, defaultWidth: 3, defaultHeight: 1, configurable: true, refreshInterval: 30,
    dataSource: loader("busStatus"),
  },
  {
    id: "hostel", name: "Hostel occupancy", description: "Beds occupied per hostel.",
    type: "progress", icon: BedDouble, category: "campus", requiredPermission: "hostel", permissionExemptRoles: SELF_SERVICE,
    defaultVisible: true, defaultOrder: 180, defaultWidth: 3, defaultHeight: 1, configurable: true, refreshInterval: 0,
    dataSource: loader("hostelOccupancy"),
  },
];

export const WIDGETS_BY_ID: ReadonlyMap<DashboardWidgetId, DashboardWidgetConfig> = new Map(WIDGET_CATALOG.map((w) => [w.id, w]));

export interface WidgetViewer {
  role: UserRole;
  /** The role covers every branch (see canSwitchScopeView), whatever it is called. */
  allBranches: boolean;
  /** Module grants from the token; null before they're known (demo sign-in), when the role rules alone apply. */
  modules?: ModulePermissions | null;
}

/** Whether the viewer's role and permissions allow this widget at all. */
export function canViewWidget(widget: DashboardWidgetConfig, viewer: WidgetViewer): boolean {
  if (widget.allowedRoles && !widget.allowedRoles.includes(viewer.role)) return false;
  if (widget.allBranchesOnly && !viewer.allBranches) return false;
  if (widget.requiredPermission && viewer.modules && !viewer.modules[widget.requiredPermission]) {
    return widget.permissionExemptRoles?.includes(viewer.role) ?? false;
  }
  return true;
}

/** Every widget this viewer may place on their dashboard, in default order. */
export function availableWidgets(viewer: WidgetViewer): DashboardWidgetConfig[] {
  return WIDGET_CATALOG.filter((w) => canViewWidget(w, viewer)).sort((a, b) => a.defaultOrder - b.defaultOrder);
}
