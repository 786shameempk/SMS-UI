import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ItemsTab from "../components/ItemsTab";
import StockTransactionsTab from "../components/StockTransactionsTab";
import VendorsCategoriesTab from "../components/VendorsCategoriesTab";
import ReportsTab from "../components/ReportsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function InventoryManagementPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Inventory management"
        description="Track items and stock levels, record purchases and issues, and manage vendors and categories."
      />

      <Tabs defaultValue="items">
        <TabsList variant="line">
          <TabsTrigger value="items">Items</TabsTrigger>
          <TabsTrigger value="transactions">Stock Transactions</TabsTrigger>
          <TabsTrigger value="vendors">Vendors & Categories</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>
        <TabsContent value="items">
          <ItemsTab />
        </TabsContent>
        <TabsContent value="transactions">
          <StockTransactionsTab />
        </TabsContent>
        <TabsContent value="vendors">
          <VendorsCategoriesTab />
        </TabsContent>
        <TabsContent value="reports">
          <ReportsTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
