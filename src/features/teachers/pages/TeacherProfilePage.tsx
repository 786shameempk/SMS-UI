import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getStaffMember } from "@/features/staff/api";
import StaffStatusBadge from "@/features/staff/components/StaffStatusBadge";
import StaffOverviewTab from "@/features/staff/components/profile/StaffOverviewTab";
import QualificationsExperienceTab from "@/features/staff/components/profile/QualificationsExperienceTab";
import SalaryTab from "@/features/staff/components/profile/SalaryTab";
import StaffAttendanceTab from "@/features/staff/components/profile/StaffAttendanceTab";
import PerformanceTab from "@/features/staff/components/profile/PerformanceTab";
import StaffDocumentsTab from "@/features/staff/components/profile/StaffDocumentsTab";
import SubjectsClassesTab from "../components/profile/SubjectsClassesTab";
import LessonPlansTab from "../components/profile/LessonPlansTab";
import StudentPerformanceTab from "../components/profile/StudentPerformanceTab";
import { PageContainer } from "@/components/ui/page";
import { EmptyState, PageSkeleton } from "@/components/ui/states";

export default function TeacherProfilePage() {
  const { staffId } = useParams<{ staffId: string }>();
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
      <PageContainer width="narrow">
        <EmptyState
          icon={SearchX}
          title="Record not found"
          description="That teacher record could not be found. It may have been removed, or you may not have access to it."
          action={
            <Button variant="outline" size="sm" onClick={() => navigate("/teachers")}>
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to teachers
            </Button>
          }
        />
      </PageContainer>
    );
  }

  return (
    <PageContainer width="narrow">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/teachers")} className="-ml-2 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to teachers
        </Button>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-page-title">
            {staff.firstName} {staff.lastName}
          </h1>
          <StaffStatusBadge status={staff.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {staff.designation} &middot; {staff.department} &middot; {staff.employeeId}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications &amp; Experience</TabsTrigger>
          <TabsTrigger value="salary">Salary</TabsTrigger>
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="subjects-classes">Subjects &amp; Classes</TabsTrigger>
          <TabsTrigger value="lesson-plans">Lesson Plans</TabsTrigger>
          <TabsTrigger value="student-performance">Student Performance</TabsTrigger>
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
        <TabsContent value="subjects-classes">
          <SubjectsClassesTab staff={staff} />
        </TabsContent>
        <TabsContent value="lesson-plans">
          <LessonPlansTab staff={staff} />
        </TabsContent>
        <TabsContent value="student-performance">
          <StudentPerformanceTab staff={staff} />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
