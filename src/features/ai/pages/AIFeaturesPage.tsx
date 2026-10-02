import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InsightsTab from "../components/InsightsTab";
import AtRiskStudentsTab from "../components/AtRiskStudentsTab";
import AssistantTab from "../components/AssistantTab";
import ContentAssistantTab from "../components/ContentAssistantTab";
import GeneratorsTab from "../components/GeneratorsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { isExamStaff } from "@/features/online-exams/constants";
import { useAuthStore } from "@/store/authStore";

export default function AIFeaturesPage() {
  const role = useAuthStore((s) => s.user?.role);
  const isStaff = isExamStaff(role);

  return (
    <PageContainer>
      <PageHeader
        title="AI Features"
        description="Ask School AI, build teaching material with AI drafts you review, and see rule-based insights computed from this school's real data."
      />

      <Tabs defaultValue="ask">
        <TabsList variant="line">
          <TabsTrigger value="ask">Ask School AI</TabsTrigger>
          {isStaff && <TabsTrigger value="tools">Teacher Tools</TabsTrigger>}
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="at-risk">At-Risk Students</TabsTrigger>
          <TabsTrigger value="assistant">Content Assistant</TabsTrigger>
        </TabsList>
        <TabsContent value="ask">
          <AssistantTab />
        </TabsContent>
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
      </Tabs>
    </PageContainer>
  );
}
