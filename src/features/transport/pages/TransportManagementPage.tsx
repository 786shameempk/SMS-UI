import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import BusesTab from "../components/BusesTab";
import DriversTab from "../components/DriversTab";
import LiveTrackingTab from "../components/LiveTrackingTab";
import RoutesTab from "../components/RoutesTab";
import StudentAssignmentsTab from "../components/StudentAssignmentsTab";

export default function TransportManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Transport management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage the bus fleet, drivers, routes and stops, student transport assignments, and live GPS tracking.
        </p>
      </div>

      <Tabs defaultValue="routes">
        <TabsList className="flex-wrap h-auto">
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
    </div>
  );
}
