import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PayrollRunsTab from "../components/PayrollRunsTab";
import PayslipsTab from "../components/PayslipsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function PayrollPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Payroll"
        description="Run monthly payroll for staff, then track and pay out individual payslips."
      />

      <Tabs defaultValue="runs">
        <TabsList variant="line">
          <TabsTrigger value="runs">Payroll Runs</TabsTrigger>
          <TabsTrigger value="payslips">Payslips</TabsTrigger>
        </TabsList>
        <TabsContent value="runs">
          <PayrollRunsTab />
        </TabsContent>
        <TabsContent value="payslips">
          <PayslipsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
