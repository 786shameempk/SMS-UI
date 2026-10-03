import type { ModulePermissions, UserRole } from "@/types/auth";

export type DashboardWidgetId =
  | "stats"
  | "scopeOverview"
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
  | "notifications";

export interface DashboardWidgetDef {
  id: DashboardWidgetId;
  label: string;
  description: string;
  /** Omitted = every role can add it. */
  roles?: UserRole[];
  /** Only for users whose role covers every branch. */
  allBranchesOnly?: boolean;
  /** Only for users who can open this module (its data is refused otherwise). */
  module?: keyof ModulePermissions;
}

const FINANCE_ROLES: UserRole[] = ["admin", "superAdmin", "principal", "accountant"];

export const DASHBOARD_WIDGETS: DashboardWidgetDef[] = [
  { id: "stats", label: "Key stats", description: "Headline numbers for your role." },
  {
    id: "scopeOverview",
    label: "Branch overview",
    description: "Students, staff and fees — all branches combined, or the selected branch.",
    allBranchesOnly: true,
  },
  { id: "performance", label: "Academic performance", description: "Average score and pass rate trend." },
  { id: "revenue", label: "Fee revenue", description: "Collected vs. expected fees per month.", roles: FINANCE_ROLES },
  { id: "attendance", label: "Attendance summary", description: "Today's present, absent, late and on-leave split." },
  { id: "calendar", label: "Calendar", description: "Month view with exams, holidays and events." },
  { id: "birthdays", label: "Birthdays", description: "Upcoming student and staff birthdays." },
  { id: "holidays", label: "Holidays", description: "Upcoming public and school holidays." },
  { id: "todayClasses", label: "Today's classes", description: "Timetable for today." },
  { id: "upcomingExams", label: "Upcoming exams", description: "Next scheduled exam papers." },
  { id: "pendingAssignments", label: "Pending assignments", description: "Homework due soon and submission progress." },
  { id: "feesDue", label: "Fees due", description: "Outstanding and overdue invoices." },
  { id: "libraryDue", label: "Library due books", description: "Loans overdue or due in the next 3 days.", module: "library" },
  { id: "busStatus", label: "Bus status", description: "Live fleet status or your child's bus." },
  { id: "hostel", label: "Hostel occupancy", description: "Beds occupied per hostel." },
  { id: "recentActivity", label: "Recent activity", description: "Latest actions across the school." },
  { id: "notifications", label: "Notifications", description: "Recent announcements and reminders." },
];

/** `allBranches`: the user's role covers every branch (see canSwitchScopeView), whatever it is called. */
export function widgetsForRole(role: UserRole, allBranches: boolean, modules?: ModulePermissions | null): DashboardWidgetDef[] {
  return DASHBOARD_WIDGETS.filter(
    (w) => (!w.roles || w.roles.includes(role)) && (!w.allBranchesOnly || allBranches) && (!w.module || !modules || modules[w.module]),
  );
}
