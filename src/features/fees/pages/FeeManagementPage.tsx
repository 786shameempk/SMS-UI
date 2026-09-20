import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DiscountsTab from "../components/DiscountsTab";
import FeeStructuresTab from "../components/FeeStructuresTab";
import InvoicesTab from "../components/InvoicesTab";
import ReceiptsTab from "../components/ReceiptsTab";
import RefundsTab from "../components/RefundsTab";

export default function FeeManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Fee management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Configure fee structures and discounts, generate and track student invoices, and manage receipts and refunds.
        </p>
      </div>

      <Tabs defaultValue="structures">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="structures">Fee Structures</TabsTrigger>
          <TabsTrigger value="discounts">Discounts & Scholarships</TabsTrigger>
          <TabsTrigger value="invoices">Student Invoices</TabsTrigger>
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
        <TabsContent value="receipts">
          <ReceiptsTab />
        </TabsContent>
        <TabsContent value="refunds">
          <RefundsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
