import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InsightsTab from "../components/InsightsTab";
import AtRiskStudentsTab from "../components/AtRiskStudentsTab";
import AssistantTab from "../components/AssistantTab";
import ContentAssistantTab from "../components/ContentAssistantTab";
import GeneratorsTab from "../components/GeneratorsTab";
import StudyAssistantTab from "../components/study/StudyAssistantTab";
import StudyMaterialsPanel from "../components/study/StudyMaterialsPanel";
import UsageTab from "../components/UsageTab";
import AssistantChat from "../components/AssistantChat";
import ContentReviewTab from "../components/content/ContentReviewTab";
import LearningProfilePanel from "../components/learning/LearningProfilePanel";
import { useAuthStore } from "@/store/authStore";
import { useAiCapabilities } from "../capabilities";
import NotAvailableNotice from "../components/NotAvailableNotice";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function AIFeaturesPage() {
  // The backend decides what AI this user may use and what the configured provider supports.
  const { can, unsupported, allowed } = useAiCapabilities();
  // Students see their own profile here; parents have it in the Parent Portal, staff on each student profile.
  const myLearning = useAuthStore((s) => s.user?.role === "student") && allowed("learning-profile");
  const toolsAllowed = can("generate-questions") || unsupported("generate-questions");
  const toolsUnsupported = unsupported("generate-questions");
  const analyticsAllowed = can("analytics") || unsupported("analytics");

  return (
    <PageContainer>
      <PageHeader
        title="AI Features"
        description="Ask School AI, study from school materials with page citations, build teaching material with AI drafts you review, and see rule-based insights computed from this school's real data."
      />

      <Tabs defaultValue="ask">
        <TabsList variant="line">
          <TabsTrigger value="ask">Ask School AI</TabsTrigger>
          {can("study-assistant") && <TabsTrigger value="study">Study Assistant</TabsTrigger>}
          {myLearning && <TabsTrigger value="learning">My Learning</TabsTrigger>}
          {toolsAllowed && <TabsTrigger value="tools">Teacher Tools</TabsTrigger>}
          {can("upload-document") && <TabsTrigger value="materials">Study Materials</TabsTrigger>}
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="at-risk">At-Risk Students</TabsTrigger>
          {analyticsAllowed && <TabsTrigger value="analytics">Analytics Assistant</TabsTrigger>}
          <TabsTrigger value="assistant">Content Assistant</TabsTrigger>
          {can("author-content") && <TabsTrigger value="review">Review &amp; Publish</TabsTrigger>}
          {can("view-usage") && <TabsTrigger value="usage">AI Usage</TabsTrigger>}
        </TabsList>
        <TabsContent value="ask">
          {unsupported("chat") ? <NotAvailableNotice what="Ask School AI" /> : <AssistantTab />}
        </TabsContent>
        {can("study-assistant") && (
          <TabsContent value="study">
            <StudyAssistantTab />
          </TabsContent>
        )}
        {myLearning && (
          <TabsContent value="learning">
            <LearningProfilePanel />
          </TabsContent>
        )}
        {can("upload-document") && (
          <TabsContent value="materials">
            <StudyMaterialsPanel />
          </TabsContent>
        )}
        {toolsAllowed && (
          <TabsContent value="tools">{toolsUnsupported ? <NotAvailableNotice what="AI teacher tools" /> : <GeneratorsTab />}</TabsContent>
        )}
        <TabsContent value="insights">
          <InsightsTab />
        </TabsContent>
        <TabsContent value="at-risk">
          <AtRiskStudentsTab />
        </TabsContent>
        {analyticsAllowed && (
          <TabsContent value="analytics">
            {unsupported("analytics") ? <NotAvailableNotice what="The analytics assistant" /> : <AssistantChat mode="analytics" page="AI Features" />}
          </TabsContent>
        )}
        <TabsContent value="assistant">
          <ContentAssistantTab />
        </TabsContent>
        {can("author-content") && (
          <TabsContent value="review">
            <ContentReviewTab />
          </TabsContent>
        )}
        {can("view-usage") && (
          <TabsContent value="usage">
            <UsageTab />
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}
