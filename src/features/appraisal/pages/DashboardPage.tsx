import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, CheckCircle2, ClipboardList, Clock, Hourglass, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { getDashboard, listCycles } from "../api";
import { SelectField, categoryLabel, groupLabel, NS, pct } from "../shared";
import type { Breakdown } from "../types";

import { useTranslation } from "react-i18next";

const num = (n?: number) => (n === undefined || n === null ? "—" : n.toLocaleString());

export default function DashboardPage() {
  const { t } = useTranslation(NS);
  const [cycleId, setCycleId] = useState<string | undefined>();
  const cycles = useQuery({ queryKey: ["appraisal", "cycles", "all"], queryFn: () => listCycles() });
  const dash = useQuery({ queryKey: ["appraisal", "dashboard", cycleId], queryFn: () => getDashboard({ cycleId }) });
  const d = dash.data;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <SelectField
          aria-label={t("Appraisal cycle")}
          className="w-64"
          allLabel={t("All cycles")}
          value={cycleId}
          onChange={setCycleId}
          items={(cycles.data ?? []).filter((c) => c.status !== "Cancelled" && c.status !== "Draft").map((c) => ({ value: c.id, label: c.name }))}
        />
      </div>

      {dash.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : dash.isError ? (
        <ErrorState onRetry={() => dash.refetch()} retrying={dash.isFetching} />
      ) : !d ? (
        <EmptyState icon={BarChart3} title={t("No appraisal data yet")} description={t("Create a cycle and select participants to see progress here.")} />
      ) : (
        <>
          <StatGrid columns={4}>
            <StatCard label={t("Eligible employees")} value={num(d.eligibleEmployees ?? d.eligible)} icon={Users} tone="neutral" />
            <StatCard label={t("In the cycle")} value={num(d.participants)} icon={Users} tone="brand" />
            <StatCard label={t("Reviews assigned")} value={num(d.reviewsAssigned ?? d.assigned)} icon={ClipboardList} tone="info" />
            <StatCard label={t("Reviews completed")} value={num(d.reviewsCompleted ?? d.completed)} icon={CheckCircle2} tone="success" hint={d.completionPercent !== undefined ? t("{{p}} complete", { p: pct(d.completionPercent) }) : undefined} />
            <StatCard label={t("Reviews pending")} value={num(d.reviewsPending ?? d.pending)} icon={Hourglass} tone="warning" />
            <StatCard label={t("Overdue")} value={num(d.reviewsOverdue ?? d.overdue)} icon={Clock} tone="danger" />
            <StatCard label={t("Awaiting approval")} value={num(d.awaitingApproval)} icon={Hourglass} tone="warning" />
            <StatCard label={t("Finalized")} value={num(d.finalized)} icon={CheckCircle2} tone="success" hint={d.needsFollowUp ? t("{{n}} need follow-up", { n: d.needsFollowUp }) : undefined} />
          </StatGrid>

          {d.averageScore != null && (
            <div className="grid gap-4 lg:grid-cols-3">
              <StatCard label={t("Average overall score")} value={`${d.averageScore}%`} icon={BarChart3} tone="brand" hint={t("{{n}} scored", { n: d.scored ?? 0 })} />
              <div className="lg:col-span-2">
                <ScoreBandsCard rows={d.scoreBands ?? []} />
              </div>
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-3">
            <BreakdownCard title={t("By department")} rows={d.byDepartment} />
            <BreakdownCard title={t("By employee category")} rows={d.byCategory} label={categoryLabel} />
            <BreakdownCard title={t("By reviewer group")} rows={d.byReviewerGroup} label={groupLabel} />
          </div>
          <p className="text-xs text-muted-foreground">{t("Counts only. Small anonymous groups are not broken out, so nobody can be singled out from this page.")}</p>
        </>
      )}
    </div>
  );
}

function BreakdownCard({ title, rows, label }: { title: string; rows?: Breakdown[]; label?: (key: string) => string }) {
  const { t } = useTranslation(NS);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {!rows || rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("Nothing to show yet.")}</p>
        ) : (
          rows.map((r, i) => {
            const raw = String(r.name ?? r.label ?? r.key ?? "—");
            const assigned = r.total ?? r.assigned ?? 0;
            const completed = r.done ?? r.completed ?? 0;
            const percent = r.percent ?? r.completion ?? (assigned ? (completed / assigned) * 100 : 0);
            return (
              <div key={`${raw}-${i}`} className="space-y-1">
                <div className="flex items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{r.hidden ? t("Hidden (too few responses)") : label ? label(raw) : raw}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.hidden ? "—" : `${completed}/${assigned}${r.overdue ? ` · ${t("{{n}} overdue", { n: r.overdue })}` : ""}`}
                  </span>
                </div>
                <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(percent)} aria-label={raw} className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, percent))}%` }} />
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBandsCard({ rows }: { rows: Breakdown[] }) {
  const { t } = useTranslation(NS);
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("Score distribution")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {rows.map((r) => (
          <div key={String(r.key)} className="space-y-1">
            <div className="flex items-baseline justify-between gap-2 text-sm">
              <span className="font-medium">{t(String(r.label ?? r.key))}</span>
              <span className="text-xs text-muted-foreground">{r.done ?? r.completed ?? 0}</span>
            </div>
            <div role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(r.percent ?? 0)} aria-label={String(r.label ?? r.key)} className="h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, r.percent ?? 0))}%` }} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
