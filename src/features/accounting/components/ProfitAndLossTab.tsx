import { useQuery } from "@tanstack/react-query";
import { ArrowDownCircle, ArrowUpCircle, Scale } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { getProfitAndLoss } from "../api";
import { StatCard } from "@/components/ui/stat-card";

function StatBlock({ label, value, icon, tone }: { label: string; value: string; icon: typeof Scale; tone: "green" | "red" | "brand" }) {
  return <StatCard label={label} value={value} icon={icon} tone={({ green: "success", red: "danger", brand: "brand" } as const)[tone]} />;
}

function LineList({ title, lines, total }: { title: string; lines: Array<{ accountId: string; accountName: string; amount: number }>; total: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {lines.length === 0 && <p className="text-sm text-muted-foreground">No activity.</p>}
        {lines.map((l) => (
          <div key={l.accountId} className="flex items-center justify-between text-sm">
            <span className="text-foreground">{l.accountName}</span>
            <span className="tabular-nums text-foreground">{formatCurrency(l.amount)}</span>
          </div>
        ))}
        {lines.length > 0 && (
          <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
            <span>Total</span>
            <span className="tabular-nums">{formatCurrency(total)}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProfitAndLossTab() {
  const { data, isLoading } = useQuery({ queryKey: ["accounting", "pnl"], queryFn: getProfitAndLoss });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatBlock label="Total income" value={formatCurrency(data.incomeTotal)} icon={ArrowUpCircle} tone="green" />
        <StatBlock label="Total expenses" value={formatCurrency(data.expenseTotal)} icon={ArrowDownCircle} tone="red" />
        <StatBlock label={data.netProfit >= 0 ? "Net profit" : "Net loss"} value={formatCurrency(Math.abs(data.netProfit))} icon={Scale} tone="brand" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <LineList title="Income" lines={data.income} total={data.incomeTotal} />
        <LineList title="Expenses" lines={data.expenses} total={data.expenseTotal} />
      </div>
    </div>
  );
}
