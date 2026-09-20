import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AdmissionsTab from "../components/AdmissionsTab";
import AttendanceTrendsTab from "../components/AttendanceTrendsTab";
import DropoutAnalysisTab from "../components/DropoutAnalysisTab";
import FeeCollectionTab from "../components/FeeCollectionTab";
import HostelOccupancyTab from "../components/HostelOccupancyTab";
import LibraryUsageTab from "../components/LibraryUsageTab";
import StudentPerformanceTab from "../components/StudentPerformanceTab";
import TeacherPerformanceTab from "../components/TeacherPerformanceTab";
import TransportUtilizationTab from "../components/TransportUtilizationTab";

export default function ReportsPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Reports & analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dashboards pulled live from every module — student performance, attendance, fees, teachers, admissions, dropout risk,
          library usage, transport, and hostel occupancy.
        </p>
      </div>

      <Tabs defaultValue="student-performance">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="student-performance">Student Performance</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="fees">Fee Collection</TabsTrigger>
          <TabsTrigger value="teachers">Teacher Performance</TabsTrigger>
          <TabsTrigger value="admissions">Admissions</TabsTrigger>
          <TabsTrigger value="dropout">Dropout Analysis</TabsTrigger>
          <TabsTrigger value="library">Library Usage</TabsTrigger>
          <TabsTrigger value="transport">Transport</TabsTrigger>
          <TabsTrigger value="hostel">Hostel Occupancy</TabsTrigger>
        </TabsList>
        <TabsContent value="student-performance">
          <StudentPerformanceTab />
        </TabsContent>
        <TabsContent value="attendance">
          <AttendanceTrendsTab />
        </TabsContent>
        <TabsContent value="fees">
          <FeeCollectionTab />
        </TabsContent>
        <TabsContent value="teachers">
          <TeacherPerformanceTab />
        </TabsContent>
        <TabsContent value="admissions">
          <AdmissionsTab />
        </TabsContent>
        <TabsContent value="dropout">
          <DropoutAnalysisTab />
        </TabsContent>
        <TabsContent value="library">
          <LibraryUsageTab />
        </TabsContent>
        <TabsContent value="transport">
          <TransportUtilizationTab />
        </TabsContent>
        <TabsContent value="hostel">
          <HostelOccupancyTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
