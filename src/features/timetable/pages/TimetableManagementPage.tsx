import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ClassSectionViewTab from "../components/ClassSectionViewTab";
import RoomsTab from "../components/RoomsTab";
import StudentParentViewTab from "../components/StudentParentViewTab";
import SubstitutionsTab from "../components/SubstitutionsTab";
import TeacherViewTab from "../components/TeacherViewTab";

export default function TimetableManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Timetable management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Weekly period grids per section, room allocation, substitute teachers, and holiday awareness.
        </p>
      </div>

      <Tabs defaultValue="class-section">
        <TabsList className="flex-wrap h-auto">
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
    </div>
  );
}
