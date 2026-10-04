/* oxlint-disable react/only-export-components -- a lazy-component registry, like app/router.tsx */
import { lazy, type ReactNode } from "react";
import type { QuickAction } from "@/components/common/WelcomeHero";
import type { DashboardDataSource } from "./dataSource";
import type { WidgetDataKey } from "./sources/types";
import type { DashboardData, DashboardDateRange } from "./types";
import type { DashboardWidgetId } from "./widgets";

/**
 * WidgetRegistry: how each widget in the catalog (widgets.ts) is drawn. The renderer code is lazy-loaded, so
 * the charts library and cards a role never shows are never downloaded.
 */

/** Page-level values widgets may need besides their own data. */
export interface WidgetEnv {
  source: DashboardDataSource;
  dateRange: DashboardDateRange;
  rangeLabel: string;
  quickActions: QuickAction[];
}

export type WidgetRegistryEntry =
  /** Renders the data of `key`; WidgetRenderer fetches it and handles loading / error / access states. */
  | { kind: "loader"; key: WidgetDataKey; render: (data: unknown, env: WidgetEnv) => ReactNode; skeleton?: ReactNode }
  /** Self-contained: no data, or loads its own (the branch roll-up). */
  | { kind: "component"; render: (env: WidgetEnv) => ReactNode };

function loader<K extends WidgetDataKey>(
  key: K,
  render: (data: DashboardData[K], env: WidgetEnv) => ReactNode,
  skeleton?: ReactNode,
): WidgetRegistryEntry {
  return { kind: "loader", key, render: (data, env) => render(data as DashboardData[K], env), skeleton };
}

const StatCards = lazy(() => import("./components/StatCards"));
const StatsSkeleton = lazy(() => import("./components/StatCards").then((m) => ({ default: m.StatsSkeleton })));
const ScopeOverviewWidget = lazy(() => import("./components/ScopeOverviewWidget"));
const QuickActionsCard = lazy(() => import("./components/QuickActionsCard"));
const AttendanceSummaryCard = lazy(() => import("./components/AttendanceSummaryCard"));
const PerformanceChart = lazy(() => import("./components/PerformanceChart"));
const RevenueChart = lazy(() => import("./components/RevenueChart"));
const MiniCalendar = lazy(() => import("./components/MiniCalendar"));
const BirthdaysCard = lazy(() => import("./components/BirthdaysCard"));
const HolidaysCard = lazy(() => import("./components/HolidaysCard"));
const TodayClassesCard = lazy(() => import("./components/TodayClassesCard"));
const UpcomingExamsCard = lazy(() => import("./components/UpcomingExamsCard"));
const PendingAssignmentsCard = lazy(() => import("./components/PendingAssignmentsCard"));
const RecentActivityCard = lazy(() => import("./components/RecentActivityCard"));
const NotificationsCard = lazy(() => import("./components/NotificationsCard"));
const FeeDueCard = lazy(() => import("./components/FeeDueCard"));
const LibraryDueBooksCard = lazy(() => import("./components/LibraryDueBooksCard"));
const BusStatusCard = lazy(() => import("./components/BusStatusCard"));
const HostelOccupancyCard = lazy(() => import("./components/HostelOccupancyCard"));
// Role widgets share one chunk (./components/RoleWidgets).
const AlertsCard = lazy(() => import("./components/RoleWidgets").then((m) => ({ default: m.AlertsCard })));
const ClassAttendanceCard = lazy(() => import("./components/RoleWidgets").then((m) => ({ default: m.ClassAttendanceCard })));
const TopPerformersCard = lazy(() => import("./components/RoleWidgets").then((m) => ({ default: m.TopPerformersCard })));
const FeeStatusCard = lazy(() => import("./components/RoleWidgets").then((m) => ({ default: m.FeeStatusCard })));
const FeeDefaultersCard = lazy(() => import("./components/RoleWidgets").then((m) => ({ default: m.FeeDefaultersCard })));
const LearnerAttendanceCard = lazy(() => import("./components/RoleWidgets").then((m) => ({ default: m.LearnerAttendanceCard })));
const SchoolsOverviewCard = lazy(() => import("./components/RoleWidgets").then((m) => ({ default: m.SchoolsOverviewCard })));

export const WIDGET_REGISTRY: Record<DashboardWidgetId, WidgetRegistryEntry> = {
  stats: loader("stats", (d) => <StatCards stats={d} />, <StatsSkeleton />),
  scopeOverview: { kind: "component", render: (env) => <ScopeOverviewWidget source={env.source} dateRange={env.dateRange} rangeLabel={env.rangeLabel} /> },
  quickActions: { kind: "component", render: (env) => <QuickActionsCard actions={env.quickActions} /> },
  attendance: loader("attendance", (d) => <AttendanceSummaryCard attendance={d} />),
  performance: loader("performanceTrend", (d, env) => <PerformanceChart data={d} rangeLabel={env.rangeLabel} />),
  revenue: loader("revenueTrend", (d, env) => <RevenueChart data={d} rangeLabel={env.rangeLabel} />),
  calendar: loader("calendarEvents", (d) => <MiniCalendar events={d} />),
  birthdays: loader("birthdays", (d) => <BirthdaysCard birthdays={d} />),
  holidays: loader("holidays", (d) => <HolidaysCard holidays={d} />),
  todayClasses: loader("todayClasses", (d) => <TodayClassesCard classes={d} />),
  upcomingExams: loader("upcomingExams", (d) => <UpcomingExamsCard exams={d} />),
  pendingAssignments: loader("pendingAssignments", (d) => <PendingAssignmentsCard assignments={d} />),
  recentActivity: loader("recentActivity", (d) => <RecentActivityCard activity={d} />),
  notifications: loader("notifications", (d) => <NotificationsCard notifications={d} />),
  feesDue: loader("feesDue", (d) => <FeeDueCard fees={d} />),
  libraryDue: loader("libraryDue", (d) => <LibraryDueBooksCard books={d} />),
  busStatus: loader("busStatus", (d) => <BusStatusCard busStatus={d} />),
  hostel: loader("hostelOccupancy", (d) => <HostelOccupancyCard hostel={d} />),
  schools: loader("schools", (d) => <SchoolsOverviewCard overview={d} />),
  alerts: loader("alerts", (d) => <AlertsCard alerts={d} />),
  learnerAttendance: loader("learnerAttendance", (d) => <LearnerAttendanceCard learners={d} />),
  feeStatus: loader("feeStatus", (d) => <FeeStatusCard slices={d} />),
  classAttendance: loader("classAttendance", (d) => <ClassAttendanceCard items={d} />),
  topPerformers: loader("topPerformers", (d, env) => <TopPerformersCard items={d} rangeLabel={env.rangeLabel} />),
  feeDefaulters: loader("feeDefaulters", (d) => <FeeDefaultersCard defaulters={d} />),
};
