import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ItemsTab from "../components/ItemsTab";
import StockTransactionsTab from "../components/StockTransactionsTab";
import VendorsCategoriesTab from "../components/VendorsCategoriesTab";
import ReportsTab from "../components/ReportsTab";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { useTranslation } from "react-i18next";

export default function InventoryManagementPage() {
  const { t } = useTranslation("inventory");
  return (
    <PageContainer>
      <PageHeader
        title={t("Inventory management")}
        description={t("Track items and stock levels, record purchases and issues, and manage vendors and categories.")}
      />

      <Tabs defaultValue="items">
        <TabsList variant="line">
          <TabsTrigger value="items">{t("Items")}</TabsTrigger>
          <TabsTrigger value="transactions">{t("Stock Transactions")}</TabsTrigger>
          <TabsTrigger value="vendors">{t("Vendors & Categories")}</TabsTrigger>
          <TabsTrigger value="reports">{t("Reports")}</TabsTrigger>
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
