import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HealthRecordsTab from "../components/HealthRecordsTab";
import CheckupsTab from "../components/CheckupsTab";
import VaccinationsTab from "../components/VaccinationsTab";
import InfirmaryVisitsTab from "../components/InfirmaryVisitsTab";
import ReportsTab from "../components/ReportsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function HealthMedicalPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Health & Medical"
        description="Student health records, checkups, vaccinations, and infirmary visits."
      />

      <Tabs defaultValue="records">
        <TabsList variant="line">
          <TabsTrigger value="records">Health Records</TabsTrigger>
          <TabsTrigger value="checkups">Checkups</TabsTrigger>
          <TabsTrigger value="vaccinations">Vaccinations</TabsTrigger>
          <TabsTrigger value="visits">Infirmary Visits</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="records">
          <HealthRecordsTab />
        </TabsContent>
        <TabsContent value="checkups">
          <CheckupsTab />
        </TabsContent>
        <TabsContent value="vaccinations">
          <VaccinationsTab />
        </TabsContent>
        <TabsContent value="visits">
          <InfirmaryVisitsTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
