import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkListTab from "../components/HomeworkListTab";
import LearningResourcesTab from "../components/LearningResourcesTab";
import ProgressOverviewTab from "../components/ProgressOverviewTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function HomeworkManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Homework &amp; assignments"
        description="Assign homework, grade submissions, share learning resources and quizzes, and track engagement across classes."
      />

      <Tabs defaultValue="homework">
        <TabsList variant="line">
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
    </PageContainer>
  );
}
