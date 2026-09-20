import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { Badge } from "@/components/ui/badge";
import { fetchDashboardData } from "../api";
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

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role ?? "admin";

  const { data, isLoading } = useQuery({
    queryKey: ["dashboard", role, user?.email],
    queryFn: () => fetchDashboardData(role, user?.email),
  });

  if (isLoading || !data) return <DashboardSkeleton />;

  const showRevenue = role === "admin" || role === "superAdmin" || role === "principal" || role === "accountant";

  return (
    <div className="p-6 space-y-6 max-w-[1600px]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-foreground">
              {greeting()}, {user?.name.split(" ")[0] ?? "there"}
            </h1>
            <Badge variant="info">{ROLE_LABEL[role] ?? role}</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            {new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>
      </div>

      <StatCards stats={data.stats} />

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <PerformanceChart data={data.performanceTrend} />
          {showRevenue && <RevenueChart data={data.revenueTrend} />}
          <AttendanceSummaryCard attendance={data.attendance} />
        </div>
        <div className="space-y-4">
          <MiniCalendar events={data.calendarEvents} />
          <BirthdaysCard birthdays={data.birthdays} />
          <HolidaysCard holidays={data.holidays} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <TodayClassesCard classes={data.todayClasses} />
        <UpcomingExamsCard exams={data.upcomingExams} />
        <PendingAssignmentsCard assignments={data.pendingAssignments} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <FeeDueCard fees={data.feesDue} />
        <LibraryDueBooksCard books={data.libraryDue} />
        <BusStatusCard busStatus={data.busStatus} />
        <HostelOccupancyCard hostel={data.hostelOccupancy} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2">
          <RecentActivityCard activity={data.recentActivity} />
        </div>
        <NotificationsCard notifications={data.notifications} />
      </div>
    </div>
  );
}
