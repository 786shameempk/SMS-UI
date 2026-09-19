import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ItemsTab from "../components/ItemsTab";
import StockTransactionsTab from "../components/StockTransactionsTab";
import VendorsCategoriesTab from "../components/VendorsCategoriesTab";
import ReportsTab from "../components/ReportsTab";

export default function InventoryManagementPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Inventory management</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track items and stock levels, record purchases and issues, and manage vendors and categories.
        </p>
      </div>

      <Tabs defaultValue="items">
        <TabsList className="flex-wrap h-auto">
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
    </div>
  );
}
