import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HealthRecordsTab from "../components/HealthRecordsTab";
import CheckupsTab from "../components/CheckupsTab";
import VaccinationsTab from "../components/VaccinationsTab";
import InfirmaryVisitsTab from "../components/InfirmaryVisitsTab";
import ReportsTab from "../components/ReportsTab";

export default function HealthMedicalPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Health & Medical</h1>
        <p className="text-sm text-slate-500 mt-1">Student health records, checkups, vaccinations, and infirmary visits.</p>
      </div>

      <Tabs defaultValue="records">
        <TabsList>
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
    </div>
  );
}
