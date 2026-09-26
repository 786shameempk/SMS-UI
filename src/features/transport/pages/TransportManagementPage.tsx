import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BusesTab from "../components/BusesTab";
import DriversTab from "../components/DriversTab";
import LiveTrackingTab from "../components/LiveTrackingTab";
import RoutesTab from "../components/RoutesTab";
import StudentAssignmentsTab from "../components/StudentAssignmentsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function TransportManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Transport management"
        description="Manage the bus fleet, drivers, routes and stops, student transport assignments, and live GPS tracking."
      />

      <Tabs defaultValue="routes">
        <TabsList variant="line">
          <TabsTrigger value="routes">Routes & Stops</TabsTrigger>
          <TabsTrigger value="buses">Buses</TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="assignments">Student Assignment</TabsTrigger>
          <TabsTrigger value="live">Live Tracking</TabsTrigger>
        </TabsList>
        <TabsContent value="routes">
          <RoutesTab />
        </TabsContent>
        <TabsContent value="buses">
          <BusesTab />
        </TabsContent>
        <TabsContent value="drivers">
          <DriversTab />
        </TabsContent>
        <TabsContent value="assignments">
          <StudentAssignmentsTab />
        </TabsContent>
        <TabsContent value="live">
          <LiveTrackingTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
