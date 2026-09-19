import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Percent, Wallet, WalletCards } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { CHART_AXIS_TICK, CHART_DANGER, CHART_GRID_COLOR, CHART_PRIMARY, CHART_TOOLTIP_STYLE } from "../constants";
import { getFeeCollectionReport } from "../api";
import StatTile from "./StatTile";

export default function FeeCollectionTab() {
  const { data, isLoading } = useQuery({ queryKey: ["reports", "fee-collection"], queryFn: getFeeCollectionReport });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground py-10 text-center">Loading…</p>;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatTile label="Collected" value={formatCurrency(data.totalCollected)} icon={Wallet} />
        <StatTile label="Pending" value={formatCurrency(data.totalPending)} icon={WalletCards} />
        <StatTile label="Overdue" value={formatCurrency(data.totalOverdue)} icon={AlertTriangle} />
        <StatTile label="Collection rate" value={`${data.collectionRate}%`} icon={Percent} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fee collection</CardTitle>
          <CardDescription>Collected (by payment date) vs. pending (by due date) over the last 6 months.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.monthly} margin={{ left: -12, right: 8, top: 8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_GRID_COLOR} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_AXIS_TICK} />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tick={CHART_AXIS_TICK}
                  width={56}
                  tickFormatter={(v: number) => `₹${Math.round(v / 1000)}k`}
                />
                <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(value) => formatCurrency(Number(value))} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pending" name="Pending" fill={CHART_DANGER} radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
