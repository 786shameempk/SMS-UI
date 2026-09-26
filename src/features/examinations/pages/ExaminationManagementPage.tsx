import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExamsTab from "../components/ExamsTab";
import MarksEntryTab from "../components/MarksEntryTab";
import ResultsRankingTab from "../components/ResultsRankingTab";
import ReportCardTab from "../components/ReportCardTab";
import TranscriptTab from "../components/TranscriptTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function ExaminationManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Examination management"
        description="Schedule exams, enter marks, and review grades, rankings, report cards, and transcripts."
      />

      <Tabs defaultValue="exams">
        <TabsList variant="line">
          <TabsTrigger value="exams">Exams</TabsTrigger>
          <TabsTrigger value="marks-entry">Marks Entry</TabsTrigger>
          <TabsTrigger value="results-ranking">Results &amp; Ranking</TabsTrigger>
          <TabsTrigger value="report-cards">Report Cards</TabsTrigger>
          <TabsTrigger value="transcript">Transcript</TabsTrigger>
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
