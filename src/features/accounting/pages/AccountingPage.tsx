import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChartOfAccountsTab from "../components/ChartOfAccountsTab";
import JournalTab from "../components/JournalTab";
import TrialBalanceTab from "../components/TrialBalanceTab";
import ProfitAndLossTab from "../components/ProfitAndLossTab";
import GstTab from "../components/GstTab";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { useTranslation } from "react-i18next";

export default function AccountingPage() {
  const { t } = useTranslation("accounting");
  return (
    <PageContainer>
      <PageHeader
        title={t("Accounting")}
        description={t("Chart of accounts, double-entry journal, trial balance, profit & loss, and GST.")}
      />

      <Tabs defaultValue="journal">
        <TabsList variant="line">
          <TabsTrigger value="accounts">{t("Chart of Accounts")}</TabsTrigger>
          <TabsTrigger value="journal">{t("Journal")}</TabsTrigger>
          <TabsTrigger value="trial-balance">{t("Trial Balance")}</TabsTrigger>
          <TabsTrigger value="pnl">{t("Profit & Loss")}</TabsTrigger>
          <TabsTrigger value="gst">{t("GST")}</TabsTrigger>
        </TabsList>
        <TabsContent value="accounts">
          <ChartOfAccountsTab />
        </TabsContent>
        <TabsContent value="journal">
          <JournalTab />
        </TabsContent>
        <TabsContent value="trial-balance">
          <TrialBalanceTab />
        </TabsContent>
        <TabsContent value="pnl">
          <ProfitAndLossTab />
        </TabsContent>
        <TabsContent value="gst">
          <GstTab />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
