import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import TenantsTab from "../components/TenantsTab";
import PlansTab from "../components/PlansTab";
import AnnouncementsTab from "../components/AnnouncementsTab";
import ReportsTab from "../components/ReportsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function PlatformConsolePage() {
  return (
    <PageContainer>
      <PageHeader
        title="Platform Console"
        description="Manage tenant schools, subscription plans, and platform-wide announcements."
      />

      <Tabs defaultValue="tenants">
        <TabsList variant="line">
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
    </PageContainer>
  );
}
