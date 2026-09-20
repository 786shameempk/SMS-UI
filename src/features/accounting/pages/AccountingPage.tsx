import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChartOfAccountsTab from "../components/ChartOfAccountsTab";
import JournalTab from "../components/JournalTab";
import TrialBalanceTab from "../components/TrialBalanceTab";
import ProfitAndLossTab from "../components/ProfitAndLossTab";
import GstTab from "../components/GstTab";

export default function AccountingPage() {
  return (
    <div className="p-6 space-y-5 max-w-[1400px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Accounting</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Chart of accounts, double-entry journal, trial balance, profit &amp; loss, and GST.
        </p>
      </div>

      <Tabs defaultValue="journal">
        <TabsList className="flex-wrap h-auto">
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
    </div>
  );
}
