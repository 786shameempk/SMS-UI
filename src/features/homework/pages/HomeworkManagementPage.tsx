import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkListTab from "../components/HomeworkListTab";
import LearningResourcesTab from "../components/LearningResourcesTab";
import ProgressOverviewTab from "../components/ProgressOverviewTab";

export default function HomeworkManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Homework &amp; assignments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Assign homework, grade submissions, share learning resources and quizzes, and track engagement across classes.
        </p>
      </div>

      <Tabs defaultValue="homework">
        <TabsList>
          <TabsTrigger value="homework">Homework</TabsTrigger>
          <TabsTrigger value="resources">Learning Resources</TabsTrigger>
          <TabsTrigger value="progress">Progress Overview</TabsTrigger>
        </TabsList>
        <TabsContent value="homework">
          <HomeworkListTab />
        </TabsContent>
        <TabsContent value="resources">
          <LearningResourcesTab />
        </TabsContent>
        <TabsContent value="progress">
          <ProgressOverviewTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
