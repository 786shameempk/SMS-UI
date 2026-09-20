import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import InsightsTab from "../components/InsightsTab";
import AtRiskStudentsTab from "../components/AtRiskStudentsTab";
import ContentAssistantTab from "../components/ContentAssistantTab";

export default function AIFeaturesPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">AI Features</h1>
        <p className="text-sm text-slate-500 mt-1">Rule-based insights, at-risk flagging, and drafting — all computed from this school's real data, not a live model.</p>
      </div>

      <Tabs defaultValue="insights">
        <TabsList>
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
    </div>
  );
}
