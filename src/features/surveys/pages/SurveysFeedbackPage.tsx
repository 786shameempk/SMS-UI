import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SurveysTab from "../components/SurveysTab";
import RecordResponseTab from "../components/RecordResponseTab";
import ReportsTab from "../components/ReportsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function SurveysFeedbackPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Surveys & Feedback"
        description="Build surveys, collect responses, and review results."
      />

      <Tabs defaultValue="surveys">
        <TabsList variant="line">
          <TabsTrigger value="surveys">Surveys</TabsTrigger>
          <TabsTrigger value="respond">Record a Response</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="surveys">
          <SurveysTab />
        </TabsContent>
        <TabsContent value="respond">
          <RecordResponseTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
