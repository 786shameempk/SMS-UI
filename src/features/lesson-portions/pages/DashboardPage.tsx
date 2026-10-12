import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, BookCheck, CalendarClock, CheckCircle2, ClipboardList, Sparkles, TrendingUp } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/tables/DataTable";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/features/dashboard/chartTheme";
import { sendAssistantMessage } from "@/features/ai/assistant/api";
import { adminDashboard, teacherDashboard } from "../api";
import DrillDownDialog from "../components/DrillDownDialog";
import { Panel } from "../components/bits";
import { FilterBar, PROGRESS_STATUS, ProgressBar, RiskBadge, StatusBadge, formatDate, formatDay, pct, usePortionAccess, useReferenceData } from "../shared";
import type { PortionFilters, SubjectStatus } from "../types";

const statusColumns = (onOpen: (s: SubjectStatus) => void): ColumnDef<SubjectStatus, unknown>[] => [
  {
    id: "subject",
    header: "Subject",
    accessorFn: (r) => `${r.subjectName} ${r.className} ${r.sectionName}`,
    cell: ({ row }) => (
      <button type="button" className="text-left" onClick={() => onOpen(row.original)}>
        <p className="text-sm font-medium text-foreground hover:underline">{row.original.subjectName}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.className} {row.original.sectionName}
          {row.original.teacherName ? ` · ${row.original.teacherName}` : ""}
        </p>
      </button>
    ),
  },
  {
    id: "progress",
    header: "Completion",
    accessorFn: (r) => r.percent,
    meta: { exportValue: (r: SubjectStatus) => r.percent },
    cell: ({ row }) => <ProgressBar percent={row.original.percent} planned={row.original.plannedPercent} risk={row.original.risk} className="min-w-40" />,
  },
  { id: "risk", header: "Status", accessorFn: (r) => r.risk, cell: ({ row }) => <RiskBadge risk={row.original.risk} /> },
  { id: "deadline", header: "Deadline", accessorFn: (r) => r.deadline ?? "", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.deadline)}</span> },
];

export default function DashboardPage() {
  const access = usePortionAccess();
  const [tab, setTab] = useState(access.seesAll ? "school" : "mine");
  return (
    <Tabs value={tab} onValueChange={setTab}>
      <TabsList variant="line">
        <TabsTrigger value="mine">My teaching</TabsTrigger>
        {access.seesAll && <TabsTrigger value="school">School overview</TabsTrigger>}
      </TabsList>
      <TabsContent value="mine">
        <TeacherView />
      </TabsContent>
      {access.seesAll && (
        <TabsContent value="school">
          <AdminView />
        </TabsContent>
      )}
    </Tabs>
  );
}

function TeacherView() {
  const access = usePortionAccess();
  const data = useReferenceData({ teachers: access.seesAll });
  const [filters, setFilters] = useState<PortionFilters>({});
  const [drill, setDrill] = useState<{ planId: string; sectionId: string } | null>(null);
  const query = useQuery({ queryKey: ["portions", "dashboard", "teacher", filters], queryFn: () => teacherDashboard(filters), placeholderData: (p) => p });
  const d = query.data;

  return (
    <div className="space-y-5">
      <FilterBar value={filters} onChange={setFilters} data={data} show={access.seesAll ? ["year", "term", "class", "section", "subject", "teacher"] : ["year", "term", "class", "subject"]} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Today's lessons" value={d?.today.length ?? 0} icon={CalendarClock} tone="brand" loading={query.isLoading} />
        <StatCard label="Updates to record" value={d?.pendingUpdates.length ?? 0} icon={ClipboardList} tone={d && d.pendingUpdates.length > 0 ? "warning" : "success"} hint="Planned lessons with no record" loading={query.isLoading} />
        <StatCard label="Completed this week" value={d?.completedThisWeek ?? 0} icon={CheckCircle2} tone="success" hint="Topics" loading={query.isLoading} />
        <StatCard label="Behind schedule" value={d?.delayed.length ?? 0} icon={AlertTriangle} tone={d && d.delayed.length > 0 ? "danger" : "neutral"} hint="Subjects" loading={query.isLoading} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel
          title="Today's planned lessons"
          loading={query.isLoading}
          error={query.isError}
          onRetry={() => query.refetch()}
          empty={d && d.today.length === 0 ? { icon: CalendarClock, title: "Nothing planned for today", description: "Lessons appear here on the day they are scheduled in an approved plan." } : null}
        >
          <ul className="divide-y divide-border">
            {d?.today.map((l) => (
              <li key={`${l.lessonPlanTopicId}-${l.sectionId}`} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{l.topicTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {l.subjectName} · {l.className} {l.sectionName} · {l.chapterTitle}
                  </p>
                </div>
                <StatusBadge map={PROGRESS_STATUS} value={l.status} />
                <span className="text-xs text-muted-foreground">{l.plannedPeriods} period{l.plannedPeriods === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Pending progress updates"
          description="Lessons whose planned date has passed with nothing recorded."
          actions={
            access.canProgress && (
              <Button asChild size="sm" variant="outline">
                <Link to="/lesson-portions/progress">Record progress</Link>
              </Button>
            )
          }
          loading={query.isLoading}
          error={query.isError}
          onRetry={() => query.refetch()}
          empty={d && d.pendingUpdates.length === 0 ? { icon: BookCheck, title: "You're up to date", description: "Every lesson with a past date has a teaching record." } : null}
        >
          <ul className="divide-y divide-border">
            {d?.pendingUpdates.slice(0, 8).map((p) => (
              <li key={`${p.lessonPlanId}-${p.syllabusTopicId}-${p.sectionId}`} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.topicTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {p.subjectName} · {p.className} {p.sectionName} · planned {formatDay(p.plannedDate)}
                  </p>
                </div>
                <Badge variant={p.daysLate > 3 ? "danger" : "warning"}>{p.daysLate} day{p.daysLate === 1 ? "" : "s"} late</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Upcoming chapter deadlines"
          loading={query.isLoading}
          error={query.isError}
          onRetry={() => query.refetch()}
          empty={d && d.deadlines.length === 0 ? { icon: CalendarClock, title: "No chapter deadlines in the next two weeks" } : null}
        >
          <ul className="divide-y divide-border">
            {d?.deadlines.map((x, i) => (
              <li key={`${x.syllabusPlanId}-${x.chapterTitle}-${x.sectionName}-${i}`} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{x.chapterTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {x.subjectName} · {x.className} {x.sectionName}
                  </p>
                </div>
                <span className="text-xs tabular-nums">{pct(x.chapterPercent)}</span>
                <Badge variant={x.daysLeft <= 3 ? "danger" : "info"}>{x.daysLeft === 0 ? "Today" : `${x.daysLeft} day${x.daysLeft === 1 ? "" : "s"}`}</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Weekly teaching" description="Topics completed and periods used each week." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()}>
          <TrendChart data={d?.trend ?? []} />
        </Panel>
      </div>

      <Panel title="Classes and subjects" description="Completion against where the plan says each subject should be." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()}
        empty={d && d.subjects.length === 0 ? { icon: BookCheck, title: "No published syllabus for these classes yet", description: "Progress appears once a syllabus is published for a class you teach." } : null}>
        <DataTable searchable columns={statusColumns((s) => setDrill({ planId: s.syllabusPlanId, sectionId: s.sectionId }))} data={d?.subjects ?? []} exportFileName="my-syllabus-progress" mobileLayout="cards" pageSize={8} />
      </Panel>

      {access.seesAll && <DrillDownDialog target={drill} onClose={() => setDrill(null)} />}
    </div>
  );
}

function TrendChart({ data }: { data: Array<{ weekStart: string; topicsCompleted: number; periodsUsed: number }> }) {
  if (data.every((p) => p.topicsCompleted === 0 && p.periodsUsed === 0)) return <p className="py-8 text-center text-sm text-muted-foreground">No teaching has been recorded in this period yet.</p>;
  return (
    <div className="h-56 w-full" role="img" aria-label="Topics completed and periods used per week">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.map((p) => ({ ...p, week: formatDay(p.weekStart) }))} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} />
          <XAxis dataKey="week" tickLine={false} axisLine={false} tick={CHART_TICK} interval="preserveStartEnd" />
          <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={28} allowDecimals={false} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
          <Legend wrapperStyle={CHART_LEGEND_STYLE} />
          <Line type="monotone" dataKey="topicsCompleted" name="Topics completed" stroke="var(--color-brand-500)" strokeWidth={2} dot={false} />
          <Line type="monotone" dataKey="periodsUsed" name="Periods used" stroke="var(--color-info)" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function AdminView() {
  const data = useReferenceData({ teachers: true });
  const [filters, setFilters] = useState<PortionFilters>({});
  const [drill, setDrill] = useState<{ planId: string; sectionId: string } | null>(null);
  const query = useQuery({ queryKey: ["portions", "dashboard", "admin", filters], queryFn: () => adminDashboard(filters), placeholderData: (p) => p });
  const d = query.data;
  const s = d?.summary;

  const summarise = useMutation({
    mutationFn: () =>
      sendAssistantMessage({
        message: "Summarise the school's syllabus progress for the principal in under 150 words: overall completion against plan, which subjects and classes are behind and why it matters, and what to do first. Use the syllabus tools.",
        page: "Lesson & Portions",
      }),
  });

  return (
    <div className="space-y-5">
      <FilterBar value={filters} onChange={setFilters} data={data} show={["year", "term", "class", "subject", "teacher", "range"]} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Subjects planned" value={s?.subjects ?? 0} icon={BookCheck} tone="brand" hint={s ? `${s.chapters} chapters · ${s.topics} topics` : undefined} loading={query.isLoading} />
        <StatCard label="Overall completion" value={pct(s?.percent)} icon={TrendingUp} tone="success" hint={s?.plannedPercent !== null && s?.plannedPercent !== undefined ? `Planned ${pct(s.plannedPercent)}` : "No dates set"} loading={query.isLoading} />
        <StatCard label="Behind schedule" value={s?.behindCount ?? 0} icon={AlertTriangle} tone={s && s.behindCount > 0 ? "danger" : "neutral"} loading={query.isLoading} />
        <StatCard label="At risk" value={s?.atRiskCount ?? 0} icon={AlertTriangle} tone={s && s.atRiskCount > 0 ? "warning" : "neutral"} hint="Not enough periods left" loading={query.isLoading} />
        <StatCard label="Past deadline" value={s?.overdueCount ?? 0} icon={CalendarClock} tone={s && s.overdueCount > 0 ? "danger" : "neutral"} loading={query.isLoading} />
      </div>

      <Panel
        title="Summary for the principal"
        description="Written by the AI assistant from the figures this school's syllabus tools return. It reads the data; it never changes it."
        actions={
          <Button size="sm" variant="outline" onClick={() => summarise.mutate()} loading={summarise.isPending}>
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {summarise.data ? "Refresh" : "Summarise"}
          </Button>
        }
      >
        {summarise.isError ? (
          <p role="alert" className="text-sm text-destructive-strong">The AI summary isn't available right now. {summarise.error instanceof Error ? summarise.error.message : ""}</p>
        ) : summarise.data ? (
          <p className="whitespace-pre-line text-sm leading-6">{summarise.data.reply}</p>
        ) : (
          <p className="text-sm text-muted-foreground">Click Summarise for a short written overview.</p>
        )}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Class-wise progress" description="Completion against plan." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} empty={d && d.classes.length === 0 ? { title: "No published syllabi yet" } : null}>
          <CompletionBars rows={(d?.classes ?? []).map((c) => ({ name: c.className, percent: c.percent, planned: c.plannedPercent ?? undefined }))} label="Class-wise completion" />
        </Panel>
        <Panel title="Subject-wise progress" description="Completion against plan." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} empty={d && d.subjects.length === 0 ? { title: "No published syllabi yet" } : null}>
          <CompletionBars rows={(d?.subjects ?? []).map((c) => ({ name: c.subjectName, percent: c.percent, planned: c.plannedPercent ?? undefined }))} label="Subject-wise completion" />
        </Panel>
      </div>

      <Panel title="Subjects behind schedule" description="Select a subject to see its class, teacher, chapters and pending topics." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()}
        empty={d && d.behind.length === 0 ? { icon: CheckCircle2, title: "Nothing is behind schedule", description: "Every subject with dates is on track." } : null}>
        <DataTable searchable columns={statusColumns((r) => setDrill({ planId: r.syllabusPlanId, sectionId: r.sectionId }))} data={d?.behind ?? []} exportFileName="subjects-behind-schedule" pageSize={8} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Classes at risk" description="Classes with at least one subject behind, at risk or past its deadline." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()}
          empty={d && d.classesAtRisk.length === 0 ? { icon: CheckCircle2, title: "No class is at risk" } : null}>
          <ul className="divide-y divide-border">
            {d?.classesAtRisk.map((c) => (
              <li key={c.classId} className="flex items-center gap-3 py-2 text-sm">
                <span className="w-24 shrink-0 font-medium">{c.className}</span>
                <ProgressBar percent={c.percent} planned={c.plannedPercent} risk="Behind" className="flex-1" />
                <Badge variant="danger">{c.behindCount} behind</Badge>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Term-end forecast" description="Expected completion on the last day of each term if teaching continues at today's pace." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()}
          empty={d && d.forecast.length === 0 ? { icon: CalendarClock, title: "No upcoming term", description: "Set up terms in Academic Setup to see forecasts." } : null}>
          <ul className="divide-y divide-border">
            {d?.forecast.map((f) => (
              <li key={f.termId ?? f.termName} className="space-y-1 py-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{f.termName}</span>
                  <span className="text-xs text-muted-foreground">ends {formatDate(f.endDate)}</span>
                </div>
                <ProgressBar percent={f.expectedPercent} risk={f.likelyIncomplete > 0 ? "AtRisk" : "OnTrack"} />
                <p className="text-xs text-muted-foreground">
                  {f.onTrack} of {f.total} subject{f.total === 1 ? "" : "s"} expected to finish · {f.likelyIncomplete} likely incomplete. An estimate, not a promise.
                </p>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Chapter completion trend" description="Topics completed and periods used per week, school-wide." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()}>
        <TrendChart data={d?.trend ?? []} />
      </Panel>

      <Panel title="Teachers with outstanding updates" description="Subjects with no teaching recorded for several days." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()}
        actions={<Button asChild size="sm" variant="outline"><Link to="/lesson-portions/reports/teachers">Full teacher report</Link></Button>}
        empty={d && d.teachers.filter((t) => t.pendingUpdates > 0).length === 0 ? { icon: CheckCircle2, title: "Everyone is up to date" } : null}>
        <ul className="divide-y divide-border">
          {d?.teachers.filter((t) => t.pendingUpdates > 0).slice(0, 10).map((t) => (
            <li key={t.staffId ?? t.teacherName} className="flex flex-wrap items-center gap-2 py-2 text-sm">
              <span className="min-w-0 flex-1 truncate font-medium">{t.teacherName}</span>
              <span className="text-xs text-muted-foreground">last update {formatDate(t.lastUpdatedOn)}</span>
              <Badge variant="warning">{t.pendingUpdates} subject{t.pendingUpdates === 1 ? "" : "s"}</Badge>
            </li>
          ))}
        </ul>
      </Panel>

      <DrillDownDialog target={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function CompletionBars({ rows, label }: { rows: Array<{ name: string; percent: number; planned?: number }>; label: string }) {
  if (rows.length === 0) return null;
  const height = Math.max(180, rows.length * 32 + 40);
  return (
    <div className="w-full" style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
          <CartesianGrid {...CHART_GRID} horizontal={false} vertical />
          <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={CHART_TICK} unit="%" />
          <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={CHART_TICK} width={96} />
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
          <Legend wrapperStyle={CHART_LEGEND_STYLE} />
          <Bar dataKey="percent" name="Actual" fill="var(--color-brand-500)" radius={[0, 4, 4, 0]} barSize={10} />
          <Bar dataKey="planned" name="Planned" fill="var(--color-muted-foreground)" fillOpacity={0.45} radius={[0, 4, 4, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
