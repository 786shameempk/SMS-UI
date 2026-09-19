import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ComposeTab from "../components/ComposeTab";
import GroupsTab from "../components/GroupsTab";
import HistoryTab from "../components/HistoryTab";
import TemplatesTab from "../components/TemplatesTab";

export default function CommunicationCenterPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Communication center</h1>
        <p className="text-sm text-slate-500 mt-1">
          Compose and broadcast messages across channels, manage templates and recipient groups, and track scheduled/sent messages.
        </p>
      </div>

      <Tabs defaultValue="compose">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="groups">Groups</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        <TabsContent value="compose">
          <ComposeTab />
        </TabsContent>
        <TabsContent value="templates">
          <TemplatesTab />
        </TabsContent>
        <TabsContent value="groups">
          <GroupsTab />
        </TabsContent>
        <TabsContent value="history">
          <HistoryTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
