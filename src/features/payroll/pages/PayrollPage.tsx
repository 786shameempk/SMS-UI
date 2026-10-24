import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PayrollRunsTab from "../components/PayrollRunsTab";
import PayslipsTab from "../components/PayslipsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function PayrollPage() {
  const { t } = useTranslation("payroll");
  return (
    <PageContainer>
      <PageHeader
        title={t("Payroll")}
        description={t("Run monthly payroll for staff, then track and pay out individual payslips.")}
      />

      <Tabs defaultValue="runs">
        <TabsList variant="line">
          <TabsTrigger value="runs">{t("Payroll Runs")}</TabsTrigger>
          <TabsTrigger value="payslips">{t("Payslips")}</TabsTrigger>
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
