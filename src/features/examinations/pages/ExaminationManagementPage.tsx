import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ExamsTab from "../components/ExamsTab";
import MarksEntryTab from "../components/MarksEntryTab";
import ResultsRankingTab from "../components/ResultsRankingTab";
import ReportCardTab from "../components/ReportCardTab";
import TranscriptTab from "../components/TranscriptTab";

export default function ExaminationManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Examination management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Schedule exams, enter marks, and review grades, rankings, report cards, and transcripts.
        </p>
      </div>

      <Tabs defaultValue="exams">
        <TabsList className="flex-wrap h-auto">
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
    </div>
  );
}
