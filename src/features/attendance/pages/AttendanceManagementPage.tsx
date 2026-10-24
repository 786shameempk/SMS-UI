import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import MarkAttendanceTab from "../components/MarkAttendanceTab";
import StaffAttendanceTab from "../components/StaffAttendanceTab";
import ReportsTab from "../components/ReportsTab";
import MyLeaveSummaryTab from "../components/MyLeaveSummaryTab";
import ScanTab from "../components/ScanTab";
import CorrectionsTab from "../components/CorrectionsTab";
import ExceptionsTab from "../components/ExceptionsTab";
import AttendanceSetupTab from "../components/setup/AttendanceSetupTab";
import { useIsAttendanceAdmin } from "../methods/shared";
import { useIsTeacher } from "@/lib/roleAccess";
import { PageContainer, PageHeader } from "@/components/ui/page";

import { useTranslation } from "react-i18next";
export default function AttendanceManagementPage() {
  const { t } = useTranslation("attendance");
  // Teachers get no staff attendance register, only a read-only summary of their own leave.
  const isTeacher = useIsTeacher();
  const isAdmin = useIsAttendanceAdmin();
  return (
    <PageContainer>
      <PageHeader
        title={t("Attendance management")}
        description={
          isTeacher
            ? t("Mark daily student attendance, scan attendance passes, review reports, and see your own leave.")
            : t("Mark student and staff attendance by hand, by QR pass, card, biometric or face, and review reports and exceptions.")
        }
      />

      <Tabs defaultValue="mark-attendance">
        <TabsList variant="line">
          <TabsTrigger value="mark-attendance">{t("Mark Attendance")}</TabsTrigger>
          <TabsTrigger value="scan">{t("Scan")}</TabsTrigger>
          <TabsTrigger value="staff-attendance">{isTeacher ? t("My Leave") : t("Staff Attendance")}</TabsTrigger>
          <TabsTrigger value="corrections">{t("Corrections")}</TabsTrigger>
          {!isTeacher && <TabsTrigger value="exceptions">{t("Exceptions")}</TabsTrigger>}
          <TabsTrigger value="reports">{t("Reports")}</TabsTrigger>
          {isAdmin && <TabsTrigger value="setup">{t("Setup")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="mark-attendance">
          <MarkAttendanceTab />
        </TabsContent>
        <TabsContent value="scan">
          <ScanTab />
        </TabsContent>
        <TabsContent value="staff-attendance">
          {isTeacher ? <MyLeaveSummaryTab /> : <StaffAttendanceTab />}
        </TabsContent>
        <TabsContent value="corrections">
          <CorrectionsTab />
        </TabsContent>
        {!isTeacher && (
          <TabsContent value="exceptions">
            <ExceptionsTab />
          </TabsContent>
        )}
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="setup">
            <AttendanceSetupTab />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
