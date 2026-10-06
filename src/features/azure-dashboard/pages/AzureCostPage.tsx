import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { StatCard } from "@/components/ui/stat-card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AzureCard, QueryBoundary, UsageBar } from "../components/AzureUi";
import CostChart from "../components/CostChart";
import { useAzureCost, useAzureCostBreakdown, useAzureDailyCost } from "../hooks";
import type { CostLine } from "../types";
import { downloadCsv, isoDate, money } from "../utils";

type Range = "7d" | "30d" | "month" | "last-month" | "custom";
type Dimension = "byResource" | "byResourceGroup" | "byService" | "byLocation";

const DIMENSIONS: Array<{ value: Dimension; label: string; first: string }> = [
  { value: "byResource", label: "Resource", first: "Resource" },
  { value: "byResourceGroup", label: "Resource group", first: "Resource group" },
  { value: "byService", label: "Service", first: "Service" },
  { value: "byLocation", label: "Region", first: "Region" },
];

function rangeDates(range: Range, custom: { from: string; to: string }): { from: string; to: string } {
  const today = new Date();
  const day = (offset: number) => isoDate(new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset));
  switch (range) {
    case "7d": return { from: day(-6), to: day(0) };
    case "30d": return { from: day(-29), to: day(0) };
    case "month": return { from: isoDate(new Date(today.getFullYear(), today.getMonth(), 1)), to: day(0) };
    case "last-month": return { from: isoDate(new Date(today.getFullYear(), today.getMonth() - 1, 1)), to: isoDate(new Date(today.getFullYear(), today.getMonth(), 0)) };
    default: return custom;
  }
}

function Change({ value }: { value: number | null }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return <Badge variant={value > 10 ? "warning" : "neutral"}>{value > 0 ? "+" : ""}{value.toFixed(1)}%</Badge>;
}

export default function AzureCostPage() {
  const cost = useAzureCost();
  const breakdown = useAzureCostBreakdown();
  const [range, setRange] = useState<Range>("month");
  const [custom, setCustom] = useState(() => rangeDates("30d", { from: "", to: "" }));
  const [dimension, setDimension] = useState<Dimension>("byResource");

  const dates = useMemo(() => rangeDates(range, custom), [range, custom]);
  const validRange = dates.from !== "" && dates.to !== "" && dates.from <= dates.to;
  const daily = useAzureDailyCost(validRange ? dates.from : "", validRange ? dates.to : "");

  const currency = cost.data?.currency ?? breakdown.data?.currency ?? "";
  const budgetUsed = cost.data?.monthlyBudget ? (cost.data.monthToDate / cost.data.monthlyBudget) * 100 : null;
  const total = daily.data?.reduce((sum, d) => sum + d.cost, 0) ?? 0;
  const averagePerDay = daily.data && daily.data.length > 0 ? total / daily.data.length : null;

  const lines: CostLine[] = breakdown.data?.[dimension] ?? [];
  const first = DIMENSIONS.find((d) => d.value === dimension)!.first;
  const showType = dimension === "byResource";

  return (
    <div className="space-y-6">
      <section aria-label="Cost summary" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Current month" loading={cost.isPending} value={cost.isError ? "Unavailable" : money(cost.data?.monthToDate, currency)} tone="brand" />
        <StatCard label="Previous month" loading={cost.isPending} value={money(cost.data?.previousMonth, currency)} tone="neutral" />
        <StatCard label="Forecast" loading={cost.isPending} value={cost.data?.forecast != null ? money(cost.data.forecast, currency) : "Not available"} tone="warning" hint="Month total projected by Azure" />
        <StatCard label="Today / yesterday" loading={cost.isPending} value={money(cost.data?.today, currency)} hint={`Yesterday ${money(cost.data?.yesterday, currency)}`} tone="info" />
      </section>

      {budgetUsed !== null && cost.data?.monthlyBudget != null && (
        <AzureCard title="Monitoring budget" description="Warning at 75%, critical at 90%. Your own limit - not an Azure billing budget.">
          <UsageBar value={budgetUsed} label={`${money(cost.data.monthToDate, currency)} of ${money(cost.data.monthlyBudget, currency)}`} />
        </AzureCard>
      )}

      <AzureCard
        title="Daily cost"
        description={averagePerDay !== null ? `${money(total, currency)} in this period · ${money(averagePerDay, currency)} per day` : "Cost per day"}
        actions={
          <Button variant="outline" size="sm" disabled={!daily.data?.length} onClick={() => downloadCsv("azure-daily-cost.csv", [["Date", `Cost (${currency})`], ...(daily.data ?? []).map((d) => [d.date, d.cost])])}>
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      >
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <SegmentedControl
            aria-label="Date range"
            size="sm"
            value={range}
            onValueChange={setRange}
            options={[
              { value: "7d", label: "7 days" },
              { value: "30d", label: "30 days" },
              { value: "month", label: "This month" },
              { value: "last-month", label: "Last month" },
              { value: "custom", label: "Custom" },
            ]}
          />
          {range === "custom" && (
            <div className="flex items-center gap-2">
              <Input type="date" aria-label="From date" value={custom.from} max={custom.to || undefined} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value }))} className="w-40" />
              <span className="text-muted-foreground">to</span>
              <Input type="date" aria-label="To date" value={custom.to} min={custom.from || undefined} onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value }))} className="w-40" />
            </div>
          )}
        </div>
        {validRange ? (
          <QueryBoundary query={daily} title="Daily cost" rows={5}>{(data) => <CostChart data={data} currency={currency || ""} />}</QueryBoundary>
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">Choose a valid start and end date.</p>
        )}
      </AzureCard>

      <AzureCard
        title="Where the money goes"
        description="Current month vs previous month, from Azure Cost Management"
        actions={
          <Button
            variant="outline"
            size="sm"
            disabled={lines.length === 0}
            onClick={() => downloadCsv(`azure-cost-${dimension}.csv`, [[first, "Type", "Resource group", `Current (${currency})`, `Previous (${currency})`, "Change %"], ...lines.map((l) => [l.name, l.type, l.resourceGroup, l.cost, l.previousCost, l.changePercent])])}
          >
            <Download className="h-3.5 w-3.5" /> Export CSV
          </Button>
        }
      >
        <div className="mb-4">
          <SegmentedControl aria-label="Group costs by" size="sm" value={dimension} onValueChange={setDimension} options={DIMENSIONS.map((d) => ({ value: d.value, label: d.label }))} />
        </div>
        <QueryBoundary query={breakdown} title="Cost breakdown" isEmpty={() => lines.length === 0} emptyTitle="No cost recorded yet">
          {() => (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{first}</TableHead>
                  {showType && <TableHead>Type</TableHead>}
                  {showType && <TableHead>Resource group</TableHead>}
                  <TableHead className="text-right">Current month</TableHead>
                  <TableHead className="text-right">Previous month</TableHead>
                  <TableHead className="text-right">Change</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lines.map((line) => (
                  <TableRow key={line.key}>
                    <TableCell className="font-medium">{line.name}</TableCell>
                    {showType && <TableCell className="text-muted-foreground">{line.type ?? "—"}</TableCell>}
                    {showType && <TableCell className="text-muted-foreground">{line.resourceGroup || "—"}</TableCell>}
                    <TableCell className="text-right tabular-nums">{money(line.cost, currency)}</TableCell>
                    <TableCell className="text-right tabular-nums">{money(line.previousCost, currency)}</TableCell>
                    <TableCell className="text-right"><Change value={line.changePercent} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </QueryBoundary>
      </AzureCard>
    </div>
  );
}
