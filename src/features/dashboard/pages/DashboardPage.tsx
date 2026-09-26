import { useQuery } from "@tanstack/react-query";
import { Layers, SplitSquareHorizontal } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/useUiStore";
import { QuickActionGrid, timeOfDayGreeting, WelcomeHero } from "@/components/common/WelcomeHero";
import { cn } from "@/utils/cn";
import { fetchDashboardData } from "../api";
import { canSwitchScopeView, fetchScopeSummary } from "../scopeApi";
import { describeDateRange, resolveDateRange } from "../dateRange";
import { quickActionsFor, ROLE_TAGLINE } from "../quickActions";
import { widgetsForRole, type DashboardWidgetId } from "../widgets";
import type { DashboardScopeView } from "../types";
import StatCards from "../components/StatCards";
import AttendanceSummaryCard from "../components/AttendanceSummaryCard";
import PerformanceChart from "../components/PerformanceChart";
import RevenueChart from "../components/RevenueChart";
import TodayClassesCard from "../components/TodayClassesCard";
import UpcomingExamsCard from "../components/UpcomingExamsCard";
import PendingAssignmentsCard from "../components/PendingAssignmentsCard";
import FeeDueCard from "../components/FeeDueCard";
import LibraryDueBooksCard from "../components/LibraryDueBooksCard";
import BusStatusCard from "../components/BusStatusCard";
import HostelOccupancyCard from "../components/HostelOccupancyCard";
import NotificationsCard from "../components/NotificationsCard";
import BirthdaysCard from "../components/BirthdaysCard";
import HolidaysCard from "../components/HolidaysCard";
import MiniCalendar from "../components/MiniCalendar";
import RecentActivityCard from "../components/RecentActivityCard";
import DashboardSkeleton from "../components/DashboardSkeleton";
import DateRangePicker from "../components/DateRangePicker";
import ManageWidgetsDialog from "../components/ManageWidgetsDialog";
import ScopeOverview from "../components/ScopeOverview";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrator",
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  librarian: "Librarian",
  receptionist: "Receptionist",
  parent: "Parent",
  student: "Student",
  superAdmin: "Super Admin",
};

const SCOPE_VIEW_OPTIONS: Array<{ value: DashboardScopeView; label: string; icon: typeof Layers }> = [
  { value: "aggregated", label: "Aggregated", icon: Layers },
  { value: "segregated", label: "Segregated", icon: SplitSquareHorizontal },
];

function ScopeViewToggle({ value, onChange }: { value: DashboardScopeView; onChange: (v: DashboardScopeView) => void }) {
  return (
    <div role="radiogroup" aria-label="Dashboard view" className="inline-flex h-9 items-center gap-0.5 rounded-lg bg-secondary p-0.5">
      {SCOPE_VIEW_OPTIONS.map(({ value: v, label, icon: Icon }) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "inline-flex items-center gap-1.5 h-8 rounded-md px-3 text-xs font-medium transition-all cursor-pointer",
            value === v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  );
}


export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "admin";
  const modulePermissions = useAuthStore((s) => s.modulePermissions);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const activeBranchId = useAuthStore((s) => s.activeBranchId);
  const scopeView = useUiStore((s) => s.dashboardScopeView);
  const setScopeView = useUiStore((s) => s.setDashboardScopeView);
  const dateRange = useUiStore((s) => s.dashboardDateRange);
  const setDateRange = useUiStore((s) => s.setDashboardDateRange);
  const hiddenWidgets = useUiStore((s) => s.hiddenDashboardWidgets);
  const setHiddenWidgets = useUiStore((s) => s.setHiddenDashboardWidgets);

  const scopeEnabled = canSwitchScopeView(role);
  const availableWidgets = widgetsForRole(role);
  const show = (id: DashboardWidgetId) => availableWidgets.some((w) => w.id === id) && !hiddenWidgets.includes(id);
  const rangeLabel = describeDateRange(dateRange);

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", role, user?.email, dateRange],
    queryFn: () => fetchDashboardData(role, user?.email, dateRange),
  });

  // Aggregated ignores the header branch (every branch of the active school); segregated is just
  // that branch — so only the segregated key depends on it.
  const scope = useQuery({
    queryKey: ["dashboard", "scope", scopeView, activeTenantId, scopeView === "segregated" ? activeBranchId : null, dateRange],
    queryFn: () => fetchScopeSummary(scopeView, activeTenantId, activeBranchId, resolveDateRange(dateRange)),
    enabled: scopeEnabled && show("scopeOverview"),
  });

  if (isLoading || !data) return <DashboardSkeleton />;

  const leftColumn = show("performance") || show("revenue") || show("attendance");
  const rightColumn = show("calendar") || show("birthdays") || show("holidays");
  const nothingShown = availableWidgets.every((w) => !show(w.id));

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1600px]">
      <WelcomeHero
        eyebrow={`${ROLE_LABEL[role] ?? role} dashboard`}
        title={`${timeOfDayGreeting()}, ${user?.name.split(" ")[0] ?? "there"} 👋`}
        subtitle={ROLE_TAGLINE[role]}
        aside={
          <div className="flex items-center gap-2 flex-wrap lg:flex-nowrap lg:justify-end text-foreground">
            {scopeEnabled && show("scopeOverview") && <ScopeViewToggle value={scopeView} onChange={setScopeView} />}
            <DateRangePicker value={dateRange} onChange={setDateRange} />
            <ManageWidgetsDialog available={availableWidgets} hidden={hiddenWidgets} onChange={setHiddenWidgets} />
          </div>
        }
      />

      <QuickActionGrid actions={quickActionsFor(role, modulePermissions)} />

      {nothingShown && (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm font-medium text-foreground">Your dashboard is empty</p>
          <p className="text-sm text-muted-foreground mt-1">Use Manage widgets to add cards back.</p>
        </div>
      )}

      {scopeEnabled && show("scopeOverview") && (
        <ScopeOverview summary={scope.data} view={scopeView} isLoading={scope.isLoading} isError={scope.isError} rangeLabel={rangeLabel} />
      )}

      {show("stats") && <StatCards stats={data.stats} />}

      {(leftColumn || rightColumn) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {leftColumn && (
            <div className={cn("space-y-4", rightColumn ? "xl:col-span-2" : "xl:col-span-3")}>
              {show("performance") && <PerformanceChart data={data.performanceTrend} rangeLabel={rangeLabel} />}
              {show("revenue") && <RevenueChart data={data.revenueTrend} rangeLabel={rangeLabel} />}
              {show("attendance") && <AttendanceSummaryCard attendance={data.attendance} />}
            </div>
          )}
          {rightColumn && (
            <div className={leftColumn ? "space-y-4" : "xl:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4"}>
              {show("calendar") && <MiniCalendar events={data.calendarEvents} />}
              {show("birthdays") && <BirthdaysCard birthdays={data.birthdays} />}
              {show("holidays") && <HolidaysCard holidays={data.holidays} />}
            </div>
          )}
        </div>
      )}

      {(show("todayClasses") || show("upcomingExams") || show("pendingAssignments")) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {show("todayClasses") && <TodayClassesCard classes={data.todayClasses} />}
          {show("upcomingExams") && <UpcomingExamsCard exams={data.upcomingExams} />}
          {show("pendingAssignments") && <PendingAssignmentsCard assignments={data.pendingAssignments} />}
        </div>
      )}

      {(show("feesDue") || show("libraryDue") || show("busStatus") || show("hostel")) && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {show("feesDue") && <FeeDueCard fees={data.feesDue} />}
          {show("libraryDue") && <LibraryDueBooksCard books={data.libraryDue} />}
          {show("busStatus") && <BusStatusCard busStatus={data.busStatus} />}
          {show("hostel") && <HostelOccupancyCard hostel={data.hostelOccupancy} />}
        </div>
      )}

      {(show("recentActivity") || show("notifications")) && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          {show("recentActivity") && (
            <div className={show("notifications") ? "xl:col-span-2" : "xl:col-span-3"}>
              <RecentActivityCard activity={data.recentActivity} />
            </div>
          )}
          {show("notifications") && <NotificationsCard notifications={data.notifications} />}
        </div>
      )}
    </div>
  );
}
