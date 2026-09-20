import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TicketsTab from "../components/TicketsTab";
import RaiseTicketTab from "../components/RaiseTicketTab";
import ReportsTab from "../components/ReportsTab";

export default function HelpDeskPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Complaint / Help Desk</h1>
        <p className="text-sm text-muted-foreground mt-1">Log, assign, and track complaints and support tickets to resolution.</p>
      </div>

      <Tabs defaultValue="tickets">
        <TabsList>
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
    </div>
  );
}
