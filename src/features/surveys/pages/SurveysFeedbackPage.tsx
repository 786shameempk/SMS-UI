import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SurveysTab from "../components/SurveysTab";
import RecordResponseTab from "../components/RecordResponseTab";
import ReportsTab from "../components/ReportsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function SurveysFeedbackPage() {
  const { t } = useTranslation("surveys");
  return (
    <PageContainer>
      <PageHeader
        title={t("Surveys & Feedback")}
        description={t("Build surveys, collect responses, and review results.")}
      />

      <Tabs defaultValue="surveys">
        <TabsList variant="line">
          <TabsTrigger value="surveys">{t("Surveys")}</TabsTrigger>
          <TabsTrigger value="respond">{t("Record a Response")}</TabsTrigger>
          <TabsTrigger value="reports">{t("Reports")}</TabsTrigger>
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
