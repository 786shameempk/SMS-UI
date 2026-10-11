import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Banknote, Clock, FileText, LayoutDashboard, School, TrendingUp, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "../components/salesKit";
import { getDashboard } from "../api/ops";
import { day, money } from "../helpers";
import { useHasOfficePermission } from "../store";
import type { OfficeDashboard } from "../opsTypes";

/** A horizontal bar list: each row's bar is its share of the largest row. Plain markup, so it reads the same to a screen reader. */
function Bars({ title, rows, format = (n: number) => String(n), empty }: { title: string; rows: Array<{ label: string; value: number }>; format?: (n: number) => string; empty: string }) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-sm font-semibold">{title}</h2>
      {rows.every((r) => r.value === 0) ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.label} className="text-sm">
              <div className="flex justify-between gap-3">
                <span className="min-w-0 truncate">{r.label}</span>
                <span className="tabular-nums text-muted-foreground">{format(r.value)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary" style={{ width: `${(r.value / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

export default function DashboardPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const canAlerts = useHasOfficePermission("monitoring.view");
  const dash = useQuery({ queryKey: ["office", "dashboard", from, to], queryFn: () => getDashboard({ from, to }), placeholderData: (prev) => prev });

  return (
    <PageContainer>
      <PageHeader icon={LayoutDashboard} title="Dashboard" description="Schools, subscriptions and money at a glance." />
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1 text-sm">
          <span className="font-medium">From</span>
          <Input type="date" className="w-44" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="space-y-1 text-sm">
          <span className="font-medium">To</span>
          <Input type="date" className="w-44" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        {dash.data && <p className="pb-2 text-sm text-muted-foreground">Showing {day(dash.data.from)} – {day(dash.data.to)}. Recurring revenue is the current position, not tied to these dates.</p>}
      </div>

      {dash.isLoading ? (
        <Skeleton className="h-72 rounded-xl" />
      ) : dash.isError ? (
        <ErrorState onRetry={() => dash.refetch()} retrying={dash.isRefetching} />
      ) : (
        <Body d={dash.data!} canAlerts={canAlerts} />
      )}
    </PageContainer>
  );
}

function Body({ d, canAlerts }: { d: OfficeDashboard; canAlerts: boolean }) {
  const k = d.kpis;
  const c = d.currency;
  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Schools" value={k.totalSchools} hint={`${k.openSchools} in the pipeline`} icon={School} tone="brand" />
        <StatCard label="Active subscriptions" value={k.activeSubscriptions} hint={`${k.trialSubscriptions} on trial`} icon={BadgeCheck} tone="success" />
        <StatCard label="Monthly recurring revenue" value={money(k.mrr, c)} hint={`${money(k.arr, c)} a year, net of tax`} icon={TrendingUp} tone="info" />
        <StatCard label="Collected in period" value={money(k.collectedInPeriod, c)} hint="Verified payments only" icon={Banknote} tone="success" />
        <StatCard label="Outstanding" value={money(k.outstanding, c)} hint={`${money(k.overdue, c)} overdue`} icon={Wallet} tone={k.overdue > 0 ? "warning" : "neutral"} />
        <StatCard label="Awaiting verification" value={k.pendingVerifications} hint={money(k.pendingVerificationAmount, c)} icon={Clock} tone={k.pendingVerifications > 0 ? "warning" : "neutral"} />
        <StatCard label="Quotations awaiting approval" value={k.quotationsAwaitingApproval} icon={FileText} tone={k.quotationsAwaitingApproval > 0 ? "warning" : "neutral"} />
        {canAlerts ? (
          <Link to="/office/monitoring" className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <StatCard label="Open alerts" value={k.openAlerts} hint={`${k.criticalAlerts} critical`} icon={AlertTriangle} tone={k.criticalAlerts > 0 ? "danger" : k.openAlerts > 0 ? "warning" : "neutral"} />
          </Link>
        ) : (
          <StatCard label="At risk" value={k.overdueSubscriptions + k.suspendedSubscriptions} hint={`${k.expiringIn30Days} end within 30 days`} icon={AlertTriangle} tone="warning" />
        )}
      </div>
      {k.excludedOtherCurrency > 0 && <p className="text-xs text-muted-foreground">{k.excludedOtherCurrency} subscription(s) are billed in another currency and are not included in the {c} totals.</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Bars title="Onboarding funnel" rows={d.funnel.map((f) => ({ label: f.label, value: f.count }))} empty="No schools in the pipeline." />
        <Bars title={`Revenue collected (${c})`} rows={d.revenue.map((r) => ({ label: r.label, value: r.amount }))} format={(n) => money(n, c)} empty="No verified payments in this period." />
        <Bars title="New schools" rows={d.newSchools.map((r) => ({ label: r.label, value: r.count }))} empty="No schools were added in this period." />
        <Bars title="Subscriptions by status" rows={d.subscriptionsByStatus.map((r) => ({ label: r.label.replace(/([a-z])([A-Z])/g, "$1 $2"), value: r.count }))} empty="No subscriptions yet." />
        <Bars title={`Monthly revenue by plan (${c})`} rows={d.mrrByPlan.map((r) => ({ label: r.label, value: r.amount }))} format={(n) => money(n, c)} empty="No billing subscriptions yet." />
        <Card className="p-4">
          <h2 className="mb-3 text-sm font-semibold">Quotation conversion</h2>
          <dl className="grid grid-cols-3 gap-3 text-sm">
            <div><dt className="text-muted-foreground">Sent</dt><dd className="text-xl font-semibold tabular-nums">{d.conversion.created}</dd></div>
            <div><dt className="text-muted-foreground">Approved</dt><dd className="text-xl font-semibold tabular-nums">{d.conversion.approved}</dd><dd className="text-xs text-muted-foreground">{d.conversion.approvalRate}%</dd></div>
            <div><dt className="text-muted-foreground">Bought</dt><dd className="text-xl font-semibold tabular-nums">{d.conversion.purchased}</dd><dd className="text-xs text-muted-foreground">{d.conversion.purchaseRate}%</dd></div>
          </dl>
        </Card>
      </div>

      <Card className="p-4">
        <h2 className="mb-3 text-sm font-semibold">Ending soon</h2>
        {d.expiring.length === 0 ? (
          <p className="text-sm text-muted-foreground">No subscription ends in the next 60 days.</p>
        ) : (
          <ul className="divide-y divide-border">
            {d.expiring.map((e) => (
              <li key={e.subscriptionId} className="flex flex-wrap items-center gap-3 py-2 text-sm">
                <Link className="font-medium text-primary hover:underline" to={`/office/subscriptions/${e.subscriptionId}`}>{e.schoolName}</Link>
                <span className="text-muted-foreground">{e.planName}</span>
                <StatusBadge status={e.status} />
                <span className="ml-auto tabular-nums">{day(e.endDate)} · {e.daysLeft < 0 ? `${-e.daysLeft} days ago` : `${e.daysLeft} days`}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
