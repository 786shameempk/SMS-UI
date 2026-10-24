import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStaffMember } from "../api";
import StaffStatusBadge from "../components/StaffStatusBadge";
import StaffOverviewTab from "../components/profile/StaffOverviewTab";
import QualificationsExperienceTab from "../components/profile/QualificationsExperienceTab";
import SalaryTab from "../components/profile/SalaryTab";
import StaffAttendanceTab from "../components/profile/StaffAttendanceTab";
import PerformanceTab from "../components/profile/PerformanceTab";
import StaffDocumentsTab from "../components/profile/StaffDocumentsTab";
import LinkedLoginsPanel from "@/features/administration/users/components/LinkedLoginsPanel";
import { useAuthStore } from "@/store/authStore";
import { PageContainer } from "@/components/ui/page";
import { EmptyState, PageSkeleton } from "@/components/ui/states";

export default function StaffProfilePage() {
  const { t } = useTranslation("staff");
  const { staffId } = useParams<{ staffId: string }>();
  const role = useAuthStore((s) => s.user?.role);
  const canLinkLogins = role === "admin" || role === "superAdmin";
  const navigate = useNavigate();

  const {
    data: staff,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["staff", staffId],
    queryFn: () => getStaffMember(staffId!),
    enabled: Boolean(staffId),
  });

  if (isLoading) {
    return (
      <PageSkeleton />
    );
  }

  if (isError || !staff) {
    return (
      <PageContainer>
        <EmptyState
          icon={SearchX}
          title={t("Record not found")}
          description={t("That staff record could not be found. It may have been removed, or you may not have access to it.")}
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/staff")}>
              <ArrowLeft className="w-3.5 h-3.5" />
              {t("Back to staff")}
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/staff")} className="-ms-2 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("Back to staff")}
        </Button>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-page-title">
            {staff.firstName} {staff.lastName}
          </h1>
          <StaffStatusBadge status={staff.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {t(staff.designation)} &middot; {staff.department} &middot; {staff.employeeId}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">{t("Overview")}</TabsTrigger>
          <TabsTrigger value="qualifications">{t("Qualifications & Experience")}</TabsTrigger>
          <TabsTrigger value="salary">{t("Salary")}</TabsTrigger>
          <TabsTrigger value="attendance">{t("Attendance")}</TabsTrigger>
          <TabsTrigger value="performance">{t("Performance")}</TabsTrigger>
          <TabsTrigger value="documents">{t("Documents")}</TabsTrigger>
          {canLinkLogins && <TabsTrigger value="logins">{t("Login")}</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview">
          <StaffOverviewTab staff={staff} />
        </TabsContent>
        <TabsContent value="qualifications">
          <QualificationsExperienceTab staff={staff} />
        </TabsContent>
        <TabsContent value="salary">
          <SalaryTab staff={staff} />
        </TabsContent>
        <TabsContent value="attendance">
          <StaffAttendanceTab staffId={staff.id} />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceTab staff={staff} />
        </TabsContent>
        <TabsContent value="documents">
          <StaffDocumentsTab staff={staff} />
        </TabsContent>
        {canLinkLogins && (
          <TabsContent value="logins">
            <LinkedLoginsPanel kind="staff" personId={staff.id} />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
