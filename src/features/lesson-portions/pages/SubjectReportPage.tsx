import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/tables/DataTable";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/features/dashboard/chartTheme";
import { completionReport, examCoverageReport } from "../api";
import { Panel } from "../components/bits";
import { FilterBar, ProgressBar, RiskBadge, formatDate, pct, usePortionAccess, useReferenceData } from "../shared";
import type { ExamCoverage, PortionFilters, SubjectStatus } from "../types";
import { PrintButton } from "./TrackingPage";

interface SubjectRow {
  subjectId: string;
  subjectName: string;
  classes: number;
  sections: number;
  percent: number;
  planned: number | null;
  behind: number;
  chaptersDone: number;
  chaptersTotal: number;
}

const avg = (xs: number[]) => (xs.length === 0 ? 0 : Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10);

export default function SubjectReportPage() {
  const access = usePortionAccess();
  const data = useReferenceData({ teachers: access.seesAll });
  const [filters, setFilters] = useState<PortionFilters>({});
  const query = useQuery({ queryKey: ["portions", "completion", filters], queryFn: () => completionReport(filters), placeholderData: (p) => p });

  const subjects = useMemo<SubjectRow[]>(() => {
    const groups = new Map<string, SubjectStatus[]>();
    for (const r of query.data ?? []) groups.set(r.subjectId, [...(groups.get(r.subjectId) ?? []), r]);
    return [...groups.values()]
      .map((rows) => {
        const planned = rows.map((r) => r.plannedPercent).filter((p): p is number => p !== null && p !== undefined);
        return {
          subjectId: rows[0].subjectId,
          subjectName: rows[0].subjectName,
          classes: new Set(rows.map((r) => r.classId)).size,
          sections: rows.length,
          percent: avg(rows.map((r) => r.percent)),
          planned: planned.length ? avg(planned) : null,
          behind: rows.filter((r) => r.risk === "Behind" || r.risk === "Overdue" || r.risk === "AtRisk").length,
          chaptersDone: rows.reduce((n, r) => n + r.completedChapters, 0),
          chaptersTotal: rows.reduce((n, r) => n + r.totalChapters, 0),
        };
      })
      .sort((a, b) => a.subjectName.localeCompare(b.subjectName));
  }, [query.data]);

  const subjectColumns: ColumnDef<SubjectRow, unknown>[] = [
    { id: "subject", header: "Subject", accessorFn: (r) => r.subjectName, cell: ({ row }) => <span className="text-sm font-medium">{row.original.subjectName}</span> },
    { id: "classes", header: "Classes", accessorFn: (r) => r.classes, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.classes} ({row.original.sections} sections)</span> },
    { id: "chapters", header: "Chapters done", accessorFn: (r) => r.chaptersDone, meta: { exportValue: (r: SubjectRow) => `${r.chaptersDone}/${r.chaptersTotal}` }, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.chaptersDone} / {row.original.chaptersTotal}</span> },
    { id: "percent", header: "Average completion", accessorFn: (r) => r.percent, meta: { exportValue: (r: SubjectRow) => r.percent }, cell: ({ row }) => <ProgressBar percent={row.original.percent} planned={row.original.planned} className="min-w-44" /> },
    { id: "planned", header: "Planned", accessorFn: (r) => r.planned ?? -1, meta: { exportValue: (r: SubjectRow) => r.planned ?? "" }, cell: ({ row }) => <span className="text-sm tabular-nums">{pct(row.original.planned)}</span> },
    { id: "behind", header: "Behind", accessorFn: (r) => r.behind, cell: ({ row }) => (row.original.behind > 0 ? <Badge variant="danger">{row.original.behind}</Badge> : <span className="text-sm text-muted-foreground">0</span>) },
  ];

  const detailColumns: ColumnDef<SubjectStatus, unknown>[] = [
    { id: "subject", header: "Subject", accessorFn: (r) => r.subjectName, cell: ({ row }) => <span className="text-sm font-medium">{row.original.subjectName}</span> },
    { id: "class", header: "Class", accessorFn: (r) => `${r.className} ${r.sectionName}`, cell: ({ row }) => <span className="text-sm">{row.original.className} {row.original.sectionName}</span> },
    { id: "actual", header: "Actual", accessorFn: (r) => r.percent, cell: ({ row }) => <span className="text-sm tabular-nums">{pct(row.original.percent)}</span> },
    { id: "planned", header: "Planned", accessorFn: (r) => r.plannedPercent ?? -1, meta: { exportValue: (r: SubjectStatus) => r.plannedPercent ?? "" }, cell: ({ row }) => <span className="text-sm tabular-nums">{pct(row.original.plannedPercent)}</span> },
    {
      id: "variance",
      header: "Ahead / behind",
      accessorFn: (r) => r.variance ?? 0,
      meta: { exportValue: (r: SubjectStatus) => r.variance ?? "" },
      cell: ({ row }) => {
        const v = row.original.variance;
        return v === null || v === undefined ? <span className="text-sm text-muted-foreground">—</span> : <span className={`text-sm tabular-nums ${v < 0 ? "text-destructive-strong" : "text-success-strong"}`}>{v > 0 ? "+" : ""}{v.toFixed(1)} pts</span>;
      },
    },
    { id: "risk", header: "Status", accessorFn: (r) => r.risk, cell: ({ row }) => <RiskBadge risk={row.original.risk} /> },
    { id: "deadline", header: "Deadline", accessorFn: (r) => r.deadline ?? "", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.deadline)}</span> },
    {
      id: "forecast",
      header: "Term-end forecast",
      accessorFn: (r) => r.forecast ?? "",
      cell: ({ row }) => {
        const { forecast, deadline } = row.original;
        if (!forecast) return <span className="text-sm text-muted-foreground">Not enough data</span>;
        const late = deadline && forecast > deadline;
        return (
          <span className="flex items-center gap-1.5 text-sm">
            {formatDate(forecast)}
            {late && <Badge variant="warning">after deadline</Badge>}
          </span>
        );
      },
    },
    { id: "periods", header: "Periods left / available", accessorFn: (r) => r.remainingPeriods, meta: { exportValue: (r: SubjectStatus) => `${r.remainingPeriods}/${r.availablePeriods ?? ""}` }, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.remainingPeriods} / {row.original.availablePeriods ?? "—"}</span> },
  ];

  const chart = subjects.map((s) => ({ name: s.subjectName, Actual: s.percent, Planned: s.planned ?? undefined }));

  return (
    <div className="space-y-4">
      <FilterBar value={filters} onChange={setFilters} data={data} show={access.seesAll ? ["year", "term", "class", "section", "subject", "teacher"] : ["year", "term", "class", "section", "subject"]} />
      <Tabs defaultValue="subjects">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList variant="line">
            <TabsTrigger value="subjects">By subject</TabsTrigger>
            <TabsTrigger value="planned">Planned vs actual</TabsTrigger>
            <TabsTrigger value="exams">Exam portions not covered</TabsTrigger>
          </TabsList>
          <PrintButton />
        </div>
        <TabsContent value="subjects" className="space-y-4">
          <Panel title="Completion by subject" description="Average across the classes and sections that match the filters." loading={query.isLoading} error={query.isError} onRetry={() => query.refetch()} empty={subjects.length === 0 && !query.isLoading ? { title: "No published syllabus matches these filters" } : null}>
            <div className="w-full" style={{ height: Math.max(200, chart.length * 34 + 40) }} role="img" aria-label="Actual and planned completion by subject">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} layout="vertical" margin={{ left: 8, right: 16, top: 4, bottom: 0 }}>
                  <CartesianGrid {...CHART_GRID} horizontal={false} vertical />
                  <XAxis type="number" domain={[0, 100]} tickLine={false} axisLine={false} tick={CHART_TICK} unit="%" />
                  <YAxis type="category" dataKey="name" tickLine={false} axisLine={false} tick={CHART_TICK} width={110} />
                  <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => `${v}%`} />
                  <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                  <Bar dataKey="Actual" fill="var(--color-brand-500)" radius={[0, 4, 4, 0]} barSize={10} />
                  <Bar dataKey="Planned" fill="var(--color-muted-foreground)" fillOpacity={0.45} radius={[0, 4, 4, 0]} barSize={10} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Panel>
          <DataTable searchable columns={subjectColumns} data={subjects} isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} exportFileName="subject-completion" pageSize={15} />
        </TabsContent>
        <TabsContent value="planned">
          <DataTable searchable columns={detailColumns} data={query.data ?? []} isLoading={query.isLoading} isError={query.isError} onRetry={() => query.refetch()} exportFileName="planned-vs-actual" pageSize={15} empty={{ title: "No published syllabus matches these filters" }} />
        </TabsContent>
        <TabsContent value="exams">
          <ExamGaps classId={filters.classId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ExamGaps({ classId }: { classId?: string }) {
  const query = useQuery({ queryKey: ["portions", "exam-coverage-report", classId], queryFn: () => examCoverageReport(classId) });
  const rows = (query.data ?? []).filter((r) => r.untaught.length > 0);
  const columns: ColumnDef<ExamCoverage, unknown>[] = [
    { id: "exam", header: "Exam", accessorFn: (r) => r.examName, cell: ({ row }) => <span className="text-sm font-medium">{row.original.examName}</span> },
    { id: "subject", header: "Subject", accessorFn: (r) => r.subjectName, cell: ({ row }) => <span className="text-sm">{row.original.subjectName}</span> },
    { id: "coverage", header: "Covered", accessorFn: (r) => r.coveragePercent, meta: { exportValue: (r: ExamCoverage) => `${r.taughtTopics}/${r.portionTopics}` }, cell: ({ row }) => <ProgressBar percent={row.original.coveragePercent} className="min-w-36" /> },
    {
      id: "untaught",
      header: "Not yet taught",
      accessorFn: (r) => r.untaught.map((u) => u.topicTitle).join("; "),
      cell: ({ row }) => (
        <span className="text-sm">
          {row.original.untaught.slice(0, 4).map((u) => u.topicTitle).join(", ")}
          {row.original.untaught.length > 4 ? ` and ${row.original.untaught.length - 4} more` : ""}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      searchable
      columns={columns}
      data={rows}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      exportFileName="exam-portions-not-covered"
      pageSize={15}
      empty={{ title: "No gaps before upcoming exams", description: "Every topic in the portions of upcoming exams has been taught, or no exam portions are set yet." }}
    />
  );
}
