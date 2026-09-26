import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassSectionViewTab from "../components/ClassSectionViewTab";
import RoomsTab from "../components/RoomsTab";
import StudentParentViewTab from "../components/StudentParentViewTab";
import SubstitutionsTab from "../components/SubstitutionsTab";
import TeacherViewTab from "../components/TeacherViewTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function TimetableManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Timetable management"
        description="Weekly period grids per section, room allocation, substitute teachers, and holiday awareness."
      />

      <Tabs defaultValue="class-section">
        <TabsList variant="line">
          <TabsTrigger value="class-section">Class/Section View</TabsTrigger>
          <TabsTrigger value="teacher">Teacher View</TabsTrigger>
          <TabsTrigger value="student-parent">Student/Parent View</TabsTrigger>
          <TabsTrigger value="rooms">Rooms</TabsTrigger>
          <TabsTrigger value="substitutions">Substitutions</TabsTrigger>
        </TabsList>
        <TabsContent value="class-section">
          <ClassSectionViewTab />
        </TabsContent>
        <TabsContent value="teacher">
          <TeacherViewTab />
        </TabsContent>
        <TabsContent value="student-parent">
          <StudentParentViewTab />
        </TabsContent>
        <TabsContent value="rooms">
          <RoomsTab />
        </TabsContent>
        <TabsContent value="substitutions">
          <SubstitutionsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
