import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ComposeTab from "../components/ComposeTab";
import GroupsTab from "../components/GroupsTab";
import HistoryTab from "../components/HistoryTab";
import TemplatesTab from "../components/TemplatesTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function CommunicationCenterPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Communication center"
        description="Compose and broadcast messages across channels, manage templates and recipient groups, and track scheduled/sent messages."
      />

      <Tabs defaultValue="compose">
        <TabsList variant="line">
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
    </PageContainer>
  );
}
