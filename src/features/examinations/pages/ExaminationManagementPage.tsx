import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExamsTab from "../components/ExamsTab";
import MarksEntryTab from "../components/MarksEntryTab";
import ResultsRankingTab from "../components/ResultsRankingTab";
import ReportCardTab from "../components/ReportCardTab";
import TranscriptTab from "../components/TranscriptTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

import { useTranslation } from "react-i18next";
export default function ExaminationManagementPage() {
  const { t } = useTranslation("examinations");
  return (
    <PageContainer>
      <PageHeader
        title={t("Examination management")}
        description={t("Schedule exams, enter marks, and review grades, rankings, report cards, and transcripts.")}
      />

      <Tabs defaultValue="exams">
        <TabsList variant="line">
          <TabsTrigger value="exams">{t("Exams")}</TabsTrigger>
          <TabsTrigger value="marks-entry">{t("Marks Entry")}</TabsTrigger>
          <TabsTrigger value="results-ranking">{t("Results & Ranking")}</TabsTrigger>
          <TabsTrigger value="report-cards">{t("Report Cards")}</TabsTrigger>
          <TabsTrigger value="transcript">{t("Transcript")}</TabsTrigger>
        </TabsList>
        <TabsContent value="exams">
          <ExamsTab />
        </TabsContent>
        <TabsContent value="marks-entry">
          <MarksEntryTab />
        </TabsContent>
        <TabsContent value="results-ranking">
          <ResultsRankingTab />
        </TabsContent>
        <TabsContent value="report-cards">
          <ReportCardTab />
        </TabsContent>
        <TabsContent value="transcript">
          <TranscriptTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
