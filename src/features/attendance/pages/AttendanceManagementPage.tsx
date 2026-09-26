import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkAttendanceTab from "../components/MarkAttendanceTab";
import StaffAttendanceTab from "../components/StaffAttendanceTab";
import ReportsTab from "../components/ReportsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function AttendanceManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Attendance management"
        description="Mark daily student and staff attendance, and review daily, monthly, and yearly attendance reports."
      />

      <Tabs defaultValue="mark-attendance">
        <TabsList variant="line">
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
    </PageContainer>
  );
}
