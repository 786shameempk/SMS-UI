import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HomeworkListTab from "../components/HomeworkListTab";
import LearningResourcesTab from "../components/LearningResourcesTab";
import ProgressOverviewTab from "../components/ProgressOverviewTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

import { useTranslation } from "react-i18next";
export default function HomeworkManagementPage() {
  const { t } = useTranslation("homework");
  return (
    <PageContainer>
      <PageHeader
        title={t("Homework & assignments")}
        description={t("Assign homework, grade submissions, share learning resources and quizzes, and track engagement across classes.")}
      />

      <Tabs defaultValue="homework">
        <TabsList variant="line">
          <TabsTrigger value="homework">{t("Homework")}</TabsTrigger>
          <TabsTrigger value="resources">{t("Learning Resources")}</TabsTrigger>
          <TabsTrigger value="progress">{t("Progress Overview")}</TabsTrigger>
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
