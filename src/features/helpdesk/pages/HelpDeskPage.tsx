import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TicketsTab from "../components/TicketsTab";
import RaiseTicketTab from "../components/RaiseTicketTab";
import ReportsTab from "../components/ReportsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function HelpDeskPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Complaint / Help Desk"
        description="Log, assign, and track complaints and support tickets to resolution."
      />

      <Tabs defaultValue="tickets">
        <TabsList variant="line">
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="raise">Raise a Ticket</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="tickets">
          <TicketsTab />
        </TabsContent>
        <TabsContent value="raise">
          <RaiseTicketTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
