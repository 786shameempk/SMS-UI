import type { ReactNode } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Award, CalendarClock, CheckCircle2, ClipboardPenLine, FileQuestionMark, FilePen, Layers, MonitorCheck, Plus, Radio, Users, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/features/dashboard/chartTheme";
import { getOnlineExamDashboard } from "../api";
import { formatDuration, formatExamTime, formatPercent, isExamStudent } from "../constants";
import { ExamStatusBadge } from "../components/useExamActions";

const QUICK_ACTIONS: { label: string; hint: string; icon: LucideIcon; to: string }[] = [
  { label: "Create exam", hint: "Six quick steps", icon: Plus, to: "/online-exams/exams/new" },
  { label: "Question bank", hint: "Reusable questions", icon: FileQuestionMark, to: "/online-exams/question-bank" },
  { label: "Upcoming exams", hint: "Scheduled & live", icon: CalendarClock, to: "/online-exams/exams?status=Scheduled" },
  { label: "Results", hint: "Marks & publishing", icon: Award, to: "/online-exams/results" },
];

function ChartCard({ title, description, children, empty }: { title: string; description: string; children: ReactNode; empty: boolean }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {empty ? (
          <EmptyState bare size="sm" icon={Layers} title="Nothing to show yet" description="This fills in once students complete exams." className="h-56" />
        ) : (
          <div className="h-56 w-full">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ExamDashboardPage() {
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const dashboard = useQuery({ queryKey: ["online-exams", "dashboard"], queryFn: getOnlineExamDashboard, enabled: !isExamStudent(role) });

  if (isExamStudent(role)) return <Navigate to="/online-exams/my" replace />;

  const d = dashboard.data;
  const passFail = d ? [{ name: "Passed", value: d.passed }, { name: "Failed", value: d.failed }] : [];

  return (
    <PageContainer>
      <PageHeader
        icon={MonitorCheck}
        title="Online exams"
        description="Create, schedule and evaluate online exams, and see how students are doing."
        actions={
          <Button onClick={() => navigate("/online-exams/exams/new")}>
            <Plus className="h-4 w-4" />
            Create exam
          </Button>
        }
      />

      {dashboard.isError ? (
        <ErrorState title="The exam dashboard couldn't load" onRetry={() => dashboard.refetch()} retrying={dashboard.isRefetching} />
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 xl:grid-cols-7">
            <StatCard label="Total exams" value={d?.totalExams ?? 0} icon={Layers} loading={!d} />
            <StatCard label="Upcoming" value={d?.upcomingExams ?? 0} icon={CalendarClock} tone="info" loading={!d} />
            <StatCard label="Live now" value={d?.activeExams ?? 0} icon={Radio} tone="danger" loading={!d} />
            <StatCard label="Completed" value={d?.completedExams ?? 0} icon={CheckCircle2} tone="success" loading={!d} />
            <StatCard label="Drafts" value={d?.draftExams ?? 0} icon={FilePen} tone="neutral" loading={!d} />
            <StatCard label="Students appeared" value={d?.studentsAppeared ?? 0} icon={Users} tone="info" loading={!d} />
            <StatCard label="Average score" value={formatPercent(d?.averageScore)} icon={Award} tone="warning" loading={!d} />
          </section>

          <section aria-label="Quick actions" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {QUICK_ACTIONS.map((a) => (
              <Link
                key={a.label}
                to={a.to}
                className="group flex items-center gap-3 rounded-xl border border-border/80 bg-card p-3.5 shadow-sm transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground ring-1 ring-inset ring-primary/20 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                  <a.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{a.label}</span>
                  <span className="block truncate text-xs text-muted-foreground">{a.hint}</span>
                </span>
              </Link>
            ))}
          </section>

          {d && d.pendingEvaluations > 0 && (
            <Link
              to="/online-exams/evaluations"
              className="flex items-center gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-strong transition-colors hover:bg-warning-soft/70"
            >
              <ClipboardPenLine className="h-4 w-4 shrink-0" />
              <span className="flex-1">
                <strong>{d.pendingEvaluations}</strong> answer sheet{d.pendingEvaluations === 1 ? "" : "s"} waiting for evaluation.
              </span>
              <span className="font-semibold">Evaluate →</span>
            </Link>
          )}

          {!d ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-72 rounded-xl" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartCard title="Performance over time" description="Average score of each completed exam." empty={d.performanceOverTime.length === 0}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={d.performanceOverTime} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="oePerf" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="examName" tickLine={false} axisLine={false} tick={CHART_TICK} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={32} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => [`${v}%`, "Average"]} />
                    <Area type="monotone" dataKey="averagePercentage" name="Average" stroke="var(--color-brand-500)" strokeWidth={2} fill="url(#oePerf)" />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Subject-wise performance" description="Average score by subject." empty={d.subjectPerformance.length === 0}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.subjectPerformance} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="label" tickLine={false} axisLine={false} tick={CHART_TICK} />
                    <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={32} domain={[0, 100]} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} formatter={(v) => [`${v}%`, "Average"]} />
                    <Bar dataKey="value" name="Average" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Pass / fail" description="Across every evaluated result." empty={d.passed + d.failed === 0}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={passFail} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2}>
                      <Cell fill="var(--color-success)" />
                      <Cell fill="var(--color-destructive)" />
                    </Pie>
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Student participation" description="Assigned vs. appeared, recent exams." empty={d.participation.length === 0}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d.participation} margin={{ left: 0, right: 8, top: 8, bottom: 0 }} barGap={4}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="examName" tickLine={false} axisLine={false} tick={CHART_TICK} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={32} allowDecimals={false} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} cursor={{ fill: "var(--color-secondary)", opacity: 0.6 }} />
                    <Legend iconType="circle" iconSize={8} wrapperStyle={CHART_LEGEND_STYLE} />
                    <Bar dataKey="assigned" name="Assigned" fill="var(--color-secondary)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    <Bar dataKey="appeared" name="Appeared" fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Upcoming &amp; live</CardTitle>
              <CardDescription>The next exams on the calendar.</CardDescription>
            </CardHeader>
            <CardContent>
              {!d ? (
                <Skeleton className="h-24" />
              ) : d.upcoming.length === 0 ? (
                <EmptyState
                  bare
                  size="sm"
                  icon={CalendarClock}
                  title="No upcoming exams"
                  description="Scheduled exams will appear here."
                  action={
                    <Button size="sm" onClick={() => navigate("/online-exams/exams/new")}>
                      Create exam
                    </Button>
                  }
                />
              ) : (
                <ul className="divide-y divide-border">
                  {d.upcoming.map((e) => (
                    <li key={e.id}>
                      <Link to={`/online-exams/exams/${e.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-3 hover:text-primary-text">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{e.name}</span>
                          <span className="block text-xs text-muted-foreground">
                            {[e.subjectName, e.className && `${e.className}${e.sectionName ? ` · ${e.sectionName}` : ""}`].filter(Boolean).join(" · ")}
                          </span>
                        </span>
                        <span className="text-xs text-secondary-foreground">{formatExamTime(e.startUtc, e.timeZoneId)} · {formatDuration(e.durationMinutes)}</span>
                        <ExamStatusBadge status={e.status} />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </PageContainer>
  );
}
