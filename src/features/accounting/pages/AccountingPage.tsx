import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChartOfAccountsTab from "../components/ChartOfAccountsTab";
import JournalTab from "../components/JournalTab";
import TrialBalanceTab from "../components/TrialBalanceTab";
import ProfitAndLossTab from "../components/ProfitAndLossTab";
import GstTab from "../components/GstTab";
import { PageContainer, PageHeader } from "@/components/ui/page";

export default function AccountingPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Accounting"
        description="Chart of accounts, double-entry journal, trial balance, profit &amp; loss, and GST."
      />

      <Tabs defaultValue="journal">
        <TabsList variant="line">
          <TabsTrigger value="accounts">Chart of Accounts</TabsTrigger>
          <TabsTrigger value="journal">Journal</TabsTrigger>
          <TabsTrigger value="trial-balance">Trial Balance</TabsTrigger>
          <TabsTrigger value="pnl">Profit &amp; Loss</TabsTrigger>
          <TabsTrigger value="gst">GST</TabsTrigger>
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
