import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VisitorLogTab from "../components/VisitorLogTab";
import PreApprovedVisitsTab from "../components/PreApprovedVisitsTab";
import WatchlistTab from "../components/WatchlistTab";
import ReportsTab from "../components/ReportsTab";

export default function VisitorManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Visitor Management</h1>
        <p className="text-sm text-slate-500 mt-1">Front-desk visitor check-in/out, scheduled appointments, and a security watchlist.</p>
      </div>

      <Tabs defaultValue="log">
        <TabsList>
          <TabsTrigger value="log">Visitor Log</TabsTrigger>
          <TabsTrigger value="preapproved">Pre-Approved Visits</TabsTrigger>
          <TabsTrigger value="watchlist">Watchlist</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="log">
          <VisitorLogTab />
        </TabsContent>
        <TabsContent value="preapproved">
          <PreApprovedVisitsTab />
        </TabsContent>
        <TabsContent value="watchlist">
          <WatchlistTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
