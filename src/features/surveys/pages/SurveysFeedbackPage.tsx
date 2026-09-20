import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import SurveysTab from "../components/SurveysTab";
import RecordResponseTab from "../components/RecordResponseTab";
import ReportsTab from "../components/ReportsTab";

export default function SurveysFeedbackPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Surveys & Feedback</h1>
        <p className="text-sm text-slate-500 mt-1">Build surveys, collect responses, and review results.</p>
      </div>

      <Tabs defaultValue="surveys">
        <TabsList>
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
    </div>
  );
}
