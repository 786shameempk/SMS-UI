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
import { PageContainer, PageHeader } from "@/components/ui/page";

import { useTranslation } from "react-i18next";
export default function ReportsPage() {
  const { t } = useTranslation("reports");
  return (
    <PageContainer>
      <PageHeader
        title={t("Reports & analytics")}
        description={t("Dashboards pulled live from every module — student performance, attendance, fees, teachers, admissions, dropout risk, library usage, transport, and hostel occupancy.")}
      />

      <Tabs defaultValue="student-performance">
        <TabsList variant="line">
          <TabsTrigger value="student-performance">{t("Student Performance")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("Attendance")}</TabsTrigger>
          <TabsTrigger value="fees">{t("Fee Collection")}</TabsTrigger>
          <TabsTrigger value="teachers">{t("Teacher Performance")}</TabsTrigger>
          <TabsTrigger value="admissions">{t("Admissions")}</TabsTrigger>
          <TabsTrigger value="dropout">{t("Dropout Analysis")}</TabsTrigger>
          <TabsTrigger value="library">{t("Library Usage")}</TabsTrigger>
          <TabsTrigger value="transport">{t("Transport")}</TabsTrigger>
          <TabsTrigger value="hostel">{t("Hostel Occupancy")}</TabsTrigger>
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
    </PageContainer>
  );
}
