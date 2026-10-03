import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Account</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.rows.map((row) => {
                const config = ACCOUNT_TYPE_CONFIG[row.type];
                return (
                  <TableRow key={row.accountId}>
                    <TableCell className="tabular-nums text-secondary-foreground">{row.accountCode}</TableCell>
                    <TableCell>{row.accountName}</TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{config.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{row.totalDebit > 0 ? formatCurrency(row.totalDebit) : "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.totalCredit > 0 ? formatCurrency(row.totalCredit) : "—"}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
            <TableFooter>
              <TableRow className="font-semibold">
                <TableCell colSpan={3}>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(data.totalDebit)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatCurrency(data.totalCredit)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
