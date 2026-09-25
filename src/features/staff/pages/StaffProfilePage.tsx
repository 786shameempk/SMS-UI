import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
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

export default function StaffProfilePage() {
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
      <div className="p-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading staff profile…
      </div>
    );
  }

  if (isError || !staff) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">That staff record could not be found.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/staff")}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to staff
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1000px]">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/staff")} className="-ml-2 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to staff
        </Button>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-bold text-foreground">
            {staff.firstName} {staff.lastName}
          </h1>
          <StaffStatusBadge status={staff.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {staff.designation} &middot; {staff.department} &middot; {staff.employeeId}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications &amp; Experience</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {canLinkLogins && <TabsTrigger value="logins">Login</TabsTrigger>}
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
    </div>
  );
}
