import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InsightsTab from "../components/InsightsTab";
import AtRiskStudentsTab from "../components/AtRiskStudentsTab";
import ContentAssistantTab from "../components/ContentAssistantTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function AIFeaturesPage() {
  return (
    <PageContainer>
      <PageHeader
        title="AI Features"
        description="Rule-based insights, at-risk flagging, and drafting — all computed from this school's real data, not a live model."
      />

      <Tabs defaultValue="insights">
        <TabsList variant="line">
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="at-risk">At-Risk Students</TabsTrigger>
          <TabsTrigger value="assistant">Content Assistant</TabsTrigger>
        </TabsList>
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
