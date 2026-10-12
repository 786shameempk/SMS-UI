import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DiscountsTab from "../components/DiscountsTab";
import FeeStructuresTab from "../components/FeeStructuresTab";
import InvoicesTab from "../components/InvoicesTab";
import ReceiptsTab from "../components/ReceiptsTab";
import RefundsTab from "../components/RefundsTab";
import OverdueTab from "../components/OverdueTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function FeeManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Fee management"
        description="Configure fee structures and discounts, generate and track student invoices, and manage receipts and refunds."
      />

      <Tabs defaultValue="structures">
        <TabsList variant="line">
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="discounts">Discounts & Scholarships</TabsTrigger>
          <TabsTrigger value="invoices">Student Invoices</TabsTrigger>
          <TabsTrigger value="overdue">Overdue</TabsTrigger>
          <TabsTrigger value="receipts">Receipts</TabsTrigger>
          <TabsTrigger value="refunds">Refunds</TabsTrigger>
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
      </Tabs>
    </PageContainer>
  );
}
