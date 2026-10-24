import { useTranslation } from "react-i18next";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DiscountsTab from "../components/DiscountsTab";
import FeeStructuresTab from "../components/FeeStructuresTab";
import InvoicesTab from "../components/InvoicesTab";
import ReceiptsTab from "../components/ReceiptsTab";
import RefundsTab from "../components/RefundsTab";
import OverdueTab from "../components/OverdueTab";
import PaymentGatewaysTab from "../components/PaymentGatewaysTab";
import PaymentTransactionsTab from "../components/PaymentTransactionsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function FeeManagementPage() {
  const { t } = useTranslation("fees");
  return (
    <PageContainer>
      <PageHeader
        title={t("Fee management")}
        description={t("Configure fee structures and discounts, generate and track student invoices, and manage receipts and refunds.")}
      />

      <Tabs defaultValue="structures">
        <TabsList variant="line">
          <TabsTrigger value="structures">{t("Fee Structures")}</TabsTrigger>
          <TabsTrigger value="discounts">{t("Discounts & Scholarships")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("Student Invoices")}</TabsTrigger>
          <TabsTrigger value="overdue">{t("Overdue")}</TabsTrigger>
          <TabsTrigger value="receipts">{t("Receipts")}</TabsTrigger>
          <TabsTrigger value="refunds">{t("Refunds")}</TabsTrigger>
          <TabsTrigger value="gateways">{t("Payment gateways")}</TabsTrigger>
          <TabsTrigger value="gateway-activity">{t("Gateway activity")}</TabsTrigger>
        </TabsList>
        <TabsContent value="structures">
          <FeeStructuresTab />
        </TabsContent>
        <TabsContent value="discounts">
          <DiscountsTab />
        </TabsContent>
        <TabsContent value="invoices">
          <InvoicesTab />
        </TabsContent>
        <TabsContent value="overdue">
          <OverdueTab />
        </TabsContent>
        <TabsContent value="receipts">
          <ReceiptsTab />
        </TabsContent>
        <TabsContent value="refunds">
          <RefundsTab />
        </TabsContent>
        <TabsContent value="gateways">
          <PaymentGatewaysTab />
        </TabsContent>
        <TabsContent value="gateway-activity">
          <PaymentTransactionsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
