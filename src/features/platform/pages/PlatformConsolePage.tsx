import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TenantsTab from "../components/TenantsTab";
import PlansTab from "../components/PlansTab";
import AnnouncementsTab from "../components/AnnouncementsTab";
import ReportsTab from "../components/ReportsTab";

export default function PlatformConsolePage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Platform Console</h1>
        <p className="text-sm text-slate-500 mt-1">Manage tenant schools, subscription plans, and platform-wide announcements.</p>
      </div>

      <Tabs defaultValue="tenants">
        <TabsList>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="announcements">Announcements</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="tenants">
          <TenantsTab />
        </TabsContent>
        <TabsContent value="plans">
          <PlansTab />
        </TabsContent>
        <TabsContent value="announcements">
          <AnnouncementsTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
