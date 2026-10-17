import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkAttendanceTab from "../components/MarkAttendanceTab";
import StaffAttendanceTab from "../components/StaffAttendanceTab";
import ReportsTab from "../components/ReportsTab";
import MyLeaveSummaryTab from "../components/MyLeaveSummaryTab";
import { useIsTeacher } from "@/lib/roleAccess";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function AttendanceManagementPage() {
  // Teachers get no staff attendance register, only a read-only summary of their own leave.
  const isTeacher = useIsTeacher();
  return (
    <PageContainer>
      <PageHeader
        title="Attendance management"
        description={
          isTeacher
            ? "Mark daily student attendance, review attendance reports, and see your own leave."
            : "Mark daily student and staff attendance, and review daily, monthly, and yearly attendance reports."
        }
      />

      <Tabs defaultValue="mark-attendance">
        <TabsList variant="line">
          <TabsTrigger value="mark-attendance">Mark Attendance</TabsTrigger>
          <TabsTrigger value="staff-attendance">{isTeacher ? "My Leave" : "Staff Attendance"}</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="mark-attendance">
          <MarkAttendanceTab />
        </TabsContent>
        <TabsContent value="staff-attendance">
          {isTeacher ? <MyLeaveSummaryTab /> : <StaffAttendanceTab />}
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
