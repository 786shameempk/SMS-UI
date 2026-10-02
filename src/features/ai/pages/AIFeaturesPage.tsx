import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InsightsTab from "../components/InsightsTab";
import AtRiskStudentsTab from "../components/AtRiskStudentsTab";
import AssistantTab from "../components/AssistantTab";
import ContentAssistantTab from "../components/ContentAssistantTab";
import GeneratorsTab from "../components/GeneratorsTab";
import StudyAssistantTab from "../components/study/StudyAssistantTab";
import StudyMaterialsPanel from "../components/study/StudyMaterialsPanel";
import UsageTab from "../components/UsageTab";
import { USAGE_ROLES } from "../usage/constants";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { isExamStaff } from "@/features/online-exams/constants";
import { useAuthStore } from "@/store/authStore";

export default function AIFeaturesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = isExamStaff(role);
  const canSeeUsage = Boolean(role && USAGE_ROLES.includes(role));

  return (
    <PageContainer>
      <PageHeader
        title="AI Features"
        description="Ask School AI, study from school materials with page citations, build teaching material with AI drafts you review, and see rule-based insights computed from this school's real data."
      />

      <Tabs defaultValue="ask">
        <TabsList variant="line">
          <TabsTrigger value="ask">Ask School AI</TabsTrigger>
          <TabsTrigger value="study">Study Assistant</TabsTrigger>
          {isStaff && <TabsTrigger value="tools">Teacher Tools</TabsTrigger>}
          {isStaff && <TabsTrigger value="materials">Study Materials</TabsTrigger>}
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="at-risk">At-Risk Students</TabsTrigger>
          <TabsTrigger value="assistant">Content Assistant</TabsTrigger>
          {canSeeUsage && <TabsTrigger value="usage">AI Usage</TabsTrigger>}
        </TabsList>
        <TabsContent value="ask">
          <AssistantTab />
        </TabsContent>
        <TabsContent value="study">
          <StudyAssistantTab />
        </TabsContent>
        {isStaff && (
          <TabsContent value="materials">
            <StudyMaterialsPanel />
          </TabsContent>
        )}
        {isStaff && (
          <TabsContent value="tools">
            <GeneratorsTab />
          </TabsContent>
        )}
        <TabsContent value="insights">
          <InsightsTab />
        </TabsContent>
        <TabsContent value="at-risk">
          <AtRiskStudentsTab />
        </TabsContent>
        <TabsContent value="assistant">
          <ContentAssistantTab />
        </TabsContent>
        {canSeeUsage && (
          <TabsContent value="usage">
            <UsageTab />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
