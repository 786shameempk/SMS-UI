import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { ACCOUNT_TYPE_CONFIG } from "../constants";
import { getTrialBalance } from "../api";

export default function TrialBalanceTab() {
  const { data, isLoading } = useQuery({ queryKey: ["accounting", "trial-balance"], queryFn: getTrialBalance });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  const isBalanced = data.totalDebit === data.totalCredit;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Trial balance</CardTitle>
          <CardDescription>Debit and credit totals for every account with posted activity.</CardDescription>
        </div>
        <Badge variant={isBalanced ? "success" : "danger"}>{isBalanced ? "Balanced" : "Out of balance"}</Badge>
      </CardHeader>
      <CardContent>
        {data.rows.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">No posted entries yet.</p>}
        {data.rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3 font-medium">Code</th>
                  <th className="py-2 pr-3 font-medium">Account</th>
                  <th className="py-2 pr-3 font-medium">Type</th>
                  <th className="py-2 pr-3 font-medium text-right">Debit</th>
                  <th className="py-2 font-medium text-right">Credit</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => {
                  const config = ACCOUNT_TYPE_CONFIG[row.type];
                  return (
                    <tr key={row.accountId} className="border-b border-border last:border-0">
                      <td className="py-2.5 pr-3 tabular-nums text-slate-600">{row.accountCode}</td>
                      <td className="py-2.5 pr-3 text-slate-800">{row.accountName}</td>
                      <td className="py-2.5 pr-3">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                      <td className="py-2.5 pr-3 text-right tabular-nums">{row.totalDebit > 0 ? formatCurrency(row.totalDebit) : "—"}</td>
                      <td className="py-2.5 text-right tabular-nums">{row.totalCredit > 0 ? formatCurrency(row.totalCredit) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border font-semibold">
                  <td className="py-2.5 pr-3" colSpan={3}>
                    Total
                  </td>
                  <td className="py-2.5 pr-3 text-right tabular-nums">{formatCurrency(data.totalDebit)}</td>
                  <td className="py-2.5 text-right tabular-nums">{formatCurrency(data.totalCredit)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
