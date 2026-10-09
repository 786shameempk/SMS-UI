import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BusesTab from "../components/BusesTab";
import DriversTab from "../components/DriversTab";
import DriverTripTab from "../components/DriverTripTab";
import LiveTrackingTab from "../components/LiveTrackingTab";
import TrackingSetupTab from "../components/TrackingSetupTab";
import RoutesTab from "../components/RoutesTab";
import StudentAssignmentsTab from "../components/StudentAssignmentsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { EmptyState } from "@/components/ui/states";
import { ShieldAlert } from "lucide-react";
import { useTransportAccess } from "../useTransportAccess";

export default function TransportManagementPage() {
  const { office, drive } = useTransportAccess();

  if (!office && !drive) {
    return (
      <PageContainer>
        <PageHeader title="Transport management" description="Fleet, routes, drivers and live tracking." />
        <EmptyState icon={ShieldAlert} title="No transport access" description="Your role can open Transport but has no transport actions. Ask an administrator to give it Manage transport or Drive a bus trip." />
      </PageContainer>
    );
  }

  // A driver sees only the trip screen; the office sees everything (and the trip screen if it is also allowed).
  return (
    <PageContainer>
      <PageHeader
        title="Transport management"
        description="Manage the bus fleet, drivers, routes and stops, student transport assignments, and live GPS tracking."
      />

      <Tabs defaultValue={office ? "routes" : "driver"}>
        <TabsList variant="line">
          {office && <TabsTrigger value="routes">Routes & Stops</TabsTrigger>}
          {office && <TabsTrigger value="buses">Buses</TabsTrigger>}
          {office && <TabsTrigger value="drivers">Drivers</TabsTrigger>}
          {office && <TabsTrigger value="assignments">Student Assignment</TabsTrigger>}
          {office && <TabsTrigger value="live">Live Tracking</TabsTrigger>}
          {office && <TabsTrigger value="setup">Tracking setup</TabsTrigger>}
          {drive && <TabsTrigger value="driver">Driver trip</TabsTrigger>}
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
        <TabsContent value="setup">
          <TrackingSetupTab />
        </TabsContent>
        <TabsContent value="driver">
          <DriverTripTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
