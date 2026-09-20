import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkAttendanceTab from "../components/MarkAttendanceTab";
import StaffAttendanceTab from "../components/StaffAttendanceTab";
import ReportsTab from "../components/ReportsTab";

export default function AttendanceManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Attendance management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Mark daily student and staff attendance, and review daily, monthly, and yearly attendance reports.
        </p>
      </div>

      <Tabs defaultValue="mark-attendance">
        <TabsList>
          <TabsTrigger value="mark-attendance">Mark Attendance</TabsTrigger>
          <TabsTrigger value="staff-attendance">Staff Attendance</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="mark-attendance">
          <MarkAttendanceTab />
        </TabsContent>
        <TabsContent value="staff-attendance">
          <StaffAttendanceTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
