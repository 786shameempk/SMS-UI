import { AlertTriangle, Briefcase, Building2, Clock, Layers, Users, Wallet } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/utils/format";
import type { DashboardScopeView, ScopeSummary } from "../types";

const nf = new Intl.NumberFormat("en-IN");

export default function ScopeOverview({
  summary,
  view,
  isLoading,
  isError,
  rangeLabel,
}: {
  summary: ScopeSummary | undefined;
  view: DashboardScopeView;
  isLoading: boolean;
  isError: boolean;
  rangeLabel: string;
}) {
  const branches = summary?.branches ?? [];
  const total = summary?.metrics;
  const TitleIcon = view === "aggregated" ? Layers : Building2;

  const title = view === "aggregated" ? "All branches" : (branches[0]?.name ?? "Selected branch");
  const description =
    view === "aggregated"
      ? `${branches.length} ${branches.length === 1 ? "branch" : "branches"} combined · fees for ${rangeLabel}`
      : `Selected branch only · fees for ${rangeLabel}`;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TitleIcon className="w-4 h-4 text-brand-600 dark:text-brand-300" />
            {isLoading ? <Skeleton className="h-5 w-32" /> : title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {total?.failed && (
          <span className="flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400 shrink-0">
            <AlertTriangle className="w-3.5 h-3.5" /> Some data could not be loaded
          </span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
        ) : isError || !total ? (
          <p className="text-sm text-destructive py-6 text-center">Couldn't load the overview. Try again shortly.</p>
        ) : branches.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            {view === "aggregated" ? "No active branches yet." : "Pick a branch in the header to see its numbers."}
          </p>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Metric icon={Users} label="Students" value={nf.format(total.students)} />
            <Metric icon={Briefcase} label="Staff" value={nf.format(total.staff)} />
            <Metric icon={Wallet} label="Fees collected" value={formatCurrency(total.feesCollected)} />
            <Metric icon={Clock} label="Fees pending" value={formatCurrency(total.feesPending)} />
            <Metric
              icon={AlertTriangle}
              label="Overdue invoices"
              value={nf.format(total.overdueInvoices)}
              tone={total.overdueInvoices > 0 ? "danger" : undefined}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Users;
  label: string;
  value: string;
  tone?: "danger";
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 p-3">
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </div>
      <p className={`text-lg font-bold mt-1 tabular-nums ${tone === "danger" ? "text-red-600 dark:text-red-400" : "text-foreground"}`}>{value}</p>
    </div>
  );
}
