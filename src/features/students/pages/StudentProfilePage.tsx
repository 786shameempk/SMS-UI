import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStudent } from "../api";
import StudentStatusBadge from "../components/StudentStatusBadge";
import ProfileOverviewTab from "../components/profile/ProfileOverviewTab";
import GuardianEmergencyTab from "../components/profile/GuardianEmergencyTab";
import MedicalTab from "../components/profile/MedicalTab";
import TransportHostelTab from "../components/profile/TransportHostelTab";
import DocumentsTab from "../components/profile/DocumentsTab";
import IdCardTab from "../components/profile/IdCardTab";
import LinkedLoginsPanel from "@/features/administration/users/components/LinkedLoginsPanel";
import { useAuthStore } from "@/store/authStore";
import { PageContainer } from "@/components/ui/page";
import { EmptyState, PageSkeleton } from "@/components/ui/states";
import { useAiCapabilities } from "@/features/ai/capabilities";
import LearningProfilePanel from "@/features/ai/components/learning/LearningProfilePanel";

export default function StudentProfilePage() {
  const { t } = useTranslation("students");
  const { studentId } = useParams<{ studentId: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const canLinkLogins = role === "admin" || role === "superAdmin";
  const aiModule = useAuthStore((s) => !s.modulePermissions || s.modulePermissions.aiFeatures);
  const { allowed } = useAiCapabilities();
  const showLearning = aiModule && allowed("learning-profile");
  const navigate = useNavigate();

  const {
    data: student,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["students", studentId],
    queryFn: () => getStudent(studentId!),
    enabled: Boolean(studentId),
  });

  if (isLoading) {
    return (
      <PageSkeleton />
    );
  }

  if (isError || !student) {
    return (
      <PageContainer>
        <EmptyState
          icon={SearchX}
          title={t("Record not found")}
          description={t("That student record could not be found. It may have been removed, or you may not have access to it.")}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/students")}>
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("Back to students")}
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/students")} className="-ms-2 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("Back to students")}
        </Button>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-page-title">
            {student.firstName} {student.lastName}
          </h1>
          <StudentStatusBadge status={student.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {student.className} - {student.section} &middot; {t("Admission No. {{number}}", { number: student.admissionNumber })}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="guardian">{t("Guardian & Emergency")}</TabsTrigger>
          <TabsTrigger value="medical">{t("Medical")}</TabsTrigger>
          <TabsTrigger value="transport">{t("Transport & Hostel")}</TabsTrigger>
          <TabsTrigger value="documents">{t("Documents")}</TabsTrigger>
          <TabsTrigger value="idcard">{t("ID Card")}</TabsTrigger>
          {showLearning && <TabsTrigger value="learning">{t("Learning profile")}</TabsTrigger>}
          {canLinkLogins && <TabsTrigger value="logins">{t("Logins")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview">
          <ProfileOverviewTab student={student} />
        </TabsContent>
        <TabsContent value="guardian">
          <GuardianEmergencyTab student={student} />
        </TabsContent>
        <TabsContent value="medical">
          <MedicalTab student={student} />
        </TabsContent>
        <TabsContent value="transport">
          <TransportHostelTab student={student} />
        </TabsContent>
        <TabsContent value="documents">
          <DocumentsTab student={student} />
        </TabsContent>
        <TabsContent value="idcard">
          <IdCardTab student={student} />
        </TabsContent>
        {showLearning && (
          <TabsContent value="learning">
            <LearningProfilePanel studentId={student.id} />
          </TabsContent>
        )}
        {canLinkLogins && (
          <TabsContent value="logins">
            <LinkedLoginsPanel kind="student" personId={student.id} />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
