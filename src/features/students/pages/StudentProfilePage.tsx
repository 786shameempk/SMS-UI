import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Loader2 } from "lucide-react";
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

export default function StudentProfilePage() {
  const { studentId } = useParams<{ studentId: string }>();
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
      <div className="p-6 flex items-center gap-2 text-muted-foreground text-sm">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading student profile…
      </div>
    );
  }

  if (isError || !student) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">That student record could not be found.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate("/students")}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to students
        </Button>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 max-w-[1000px]">
      <div>
        <Button variant="ghost" size="sm" onClick={() => navigate("/students")} className="-ml-2 mb-2">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to students
        </Button>
        <div className="flex items-center gap-2.5 flex-wrap">
          <h1 className="text-xl font-bold text-foreground">
            {student.firstName} {student.lastName}
          </h1>
          <StudentStatusBadge status={student.status} />
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          {student.className} - {student.section} &middot; Admission No. {student.admissionNumber}
        </p>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="guardian">Guardian &amp; Emergency</TabsTrigger>
          <TabsTrigger value="medical">Medical</TabsTrigger>
          <TabsTrigger value="transport">Transport &amp; Hostel</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="idcard">ID Card</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
