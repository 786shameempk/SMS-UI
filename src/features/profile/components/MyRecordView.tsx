import type { ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { getMyStudentRecord } from "@/features/students/api";
import StudentStatusBadge from "@/features/students/components/StudentStatusBadge";
import ProfileOverviewTab from "@/features/students/components/profile/ProfileOverviewTab";
import GuardianEmergencyTab from "@/features/students/components/profile/GuardianEmergencyTab";
import MedicalTab from "@/features/students/components/profile/MedicalTab";
import TransportHostelTab from "@/features/students/components/profile/TransportHostelTab";
import DocumentsTab from "@/features/students/components/profile/DocumentsTab";
import IdCardTab from "@/features/students/components/profile/IdCardTab";
import { getMyStaffRecord } from "@/features/staff/api";
import StaffStatusBadge from "@/features/staff/components/StaffStatusBadge";
import StaffOverviewTab from "@/features/staff/components/profile/StaffOverviewTab";
import QualificationsExperienceTab from "@/features/staff/components/profile/QualificationsExperienceTab";
import SalaryTab from "@/features/staff/components/profile/SalaryTab";
import StaffAttendanceTab from "@/features/staff/components/profile/StaffAttendanceTab";
import PerformanceTab from "@/features/staff/components/profile/PerformanceTab";
import StaffDocumentsTab from "@/features/staff/components/profile/StaffDocumentsTab";
import { roleLabel } from "@/features/staff/constants";

/** `actions` sits beside the name (the change-request button); `notice` under it (what is waiting for approval). */
interface ViewProps {
  personId: string;
  actions?: ReactNode;
  notice?: ReactNode;
}

function Header({ title, badge, subtitle, actions }: { title: string; badge: ReactNode; subtitle: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-page-title">{title}</h1>
          {badge}
        </div>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {actions}
    </div>
  );
}

/** The Students detail page (StudentProfilePage) for the signed-in student or a parent's child, with every edit control hidden. */
export function MyStudentRecord({ personId, actions, notice }: ViewProps) {
  const { t } = useTranslation("students");
  const record = useQuery({ queryKey: ["my-profile", "student", personId], queryFn: () => getMyStudentRecord(personId) });

  if (record.isLoading) return <PageSkeleton />;
  if (record.isError || !record.data) {
    return <ErrorState description={record.error ? (record.error as Error).message : undefined} onRetry={() => void record.refetch()} />;
  }
  const student = record.data;

  return (
    <>
      <Header
        title={`${student.firstName} ${student.lastName}`}
        badge={<StudentStatusBadge status={student.status} />}
        subtitle={<>{student.className} - {student.section} &middot; {t("Admission No. {{number}}", { number: student.admissionNumber })}</>}
        actions={actions}
      />
      {notice}
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="guardian">{t("Guardian & Emergency")}</TabsTrigger>
          <TabsTrigger value="medical">{t("Medical")}</TabsTrigger>
          <TabsTrigger value="transport">{t("Transport & Hostel")}</TabsTrigger>
          <TabsTrigger value="documents">{t("Documents")}</TabsTrigger>
          <TabsTrigger value="idcard">{t("ID Card")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <ProfileOverviewTab student={student} readOnly />
        </TabsContent>
        <TabsContent value="guardian">
          <GuardianEmergencyTab student={student} readOnly />
        </TabsContent>
        <TabsContent value="medical">
          <MedicalTab student={student} readOnly />
        </TabsContent>
        <TabsContent value="transport">
          <TransportHostelTab student={student} readOnly />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab student={student} readOnly />
        </TabsContent>
        <TabsContent value="idcard">
          <IdCardTab student={student} />
        </TabsContent>
      </Tabs>
    </>
  );
}

/** The Staff detail page (StaffProfilePage) for the signed-in staff member, with every edit control hidden. */
export function MyStaffRecord({ personId, actions, notice }: ViewProps) {
  const { t } = useTranslation("staff");
  const record = useQuery({ queryKey: ["my-profile", "staff", personId], queryFn: () => getMyStaffRecord(personId) });

  if (record.isLoading) return <PageSkeleton />;
  if (record.isError || !record.data) {
    return <ErrorState description={record.error ? (record.error as Error).message : undefined} onRetry={() => void record.refetch()} />;
  }
  const staff = record.data;

  return (
    <>
      <Header
        title={`${staff.firstName} ${staff.lastName}`}
        badge={<StaffStatusBadge status={staff.status} />}
        subtitle={<>{t(roleLabel(staff))} &middot; {staff.department} &middot; {staff.employeeId}</>}
        actions={actions}
      />
      {notice}
      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="qualifications">{t("Qualifications & Experience")}</TabsTrigger>
          <TabsTrigger value="salary">{t("Salary")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("Attendance")}</TabsTrigger>
          <TabsTrigger value="performance">{t("Performance")}</TabsTrigger>
          <TabsTrigger value="documents">{t("Documents")}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <StaffOverviewTab staff={staff} readOnly />
        </TabsContent>
        <TabsContent value="qualifications">
          <QualificationsExperienceTab staff={staff} readOnly />
        </TabsContent>
        <TabsContent value="salary">
          <SalaryTab staff={staff} readOnly />
        </TabsContent>
        <TabsContent value="attendance">
          <StaffAttendanceTab staffId={staff.id} mine />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceTab staff={staff} readOnly />
        </TabsContent>
        <TabsContent value="documents">
          <StaffDocumentsTab staff={staff} readOnly />
        </TabsContent>
      </Tabs>
    </>
  );
}
