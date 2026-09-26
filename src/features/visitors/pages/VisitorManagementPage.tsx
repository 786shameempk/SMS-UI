import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import VisitorLogTab from "../components/VisitorLogTab";
import PreApprovedVisitsTab from "../components/PreApprovedVisitsTab";
import WatchlistTab from "../components/WatchlistTab";
import ReportsTab from "../components/ReportsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function VisitorManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Visitor Management"
        description="Front-desk visitor check-in/out, scheduled appointments, and a security watchlist."
      />

      <Tabs defaultValue="log">
        <TabsList variant="line">
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
    </PageContainer>
  );
}
