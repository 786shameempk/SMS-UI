import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Printer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/tables/DataTable";
import { completionReport, delayedReport, pendingChaptersReport } from "../api";
import DrillDownDialog from "../components/DrillDownDialog";
import { CHAPTER_STATUS, FilterBar, ProgressBar, RiskBadge, StatusBadge, formatDate, pct, usePortionAccess, useReferenceData } from "../shared";
import type { DelayedSubject, PendingChapter, PortionFilters, SubjectStatus } from "../types";

export function PrintButton() {
  return (
    <Button variant="outline" size="sm" className="print:hidden" onClick={() => window.print()}>
      <Printer className="h-4 w-4" /> Print or save as PDF
    </Button>
  );
}

export default function TrackingPage() {
  const access = usePortionAccess();
  const data = useReferenceData({ teachers: access.seesAll });
  const [filters, setFilters] = useState<PortionFilters>({});
  const [drill, setDrill] = useState<{ planId: string; sectionId: string } | null>(null);
  const open = (planId: string, sectionId: string) => (access.seesAll ? setDrill({ planId, sectionId }) : undefined);

  return (
    <div className="space-y-4">
      <FilterBar value={filters} onChange={setFilters} data={data} show={access.seesAll ? ["year", "term", "class", "section", "subject", "teacher"] : ["year", "term", "class", "section", "subject"]} />
      <Tabs defaultValue="completion">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <TabsList variant="line">
            <TabsTrigger value="completion">Class and subject completion</TabsTrigger>
            <TabsTrigger value="pending">Pending chapters</TabsTrigger>
            <TabsTrigger value="delayed">Delayed lessons and actions</TabsTrigger>
          </TabsList>
          <PrintButton />
        </div>
        <TabsContent value="completion">
          <CompletionTable filters={filters} onOpen={open} drillable={access.seesAll} />
        </TabsContent>
        <TabsContent value="pending">
          <PendingTable filters={filters} />
        </TabsContent>
        <TabsContent value="delayed">
          <DelayedTable filters={filters} onOpen={open} drillable={access.seesAll} />
        </TabsContent>
      </Tabs>
      <DrillDownDialog target={drill} onClose={() => setDrill(null)} />
    </div>
  );
}

function CompletionTable({ filters, onOpen, drillable }: { filters: PortionFilters; onOpen: (planId: string, sectionId: string) => void; drillable: boolean }) {
  const query = useQuery({ queryKey: ["portions", "completion", filters], queryFn: () => completionReport(filters), placeholderData: (p) => p });
  const columns: ColumnDef<SubjectStatus, unknown>[] = [
    {
      id: "class",
      header: "Class",
      accessorFn: (r) => `${r.className} ${r.sectionName}`,
      cell: ({ row }) => <span className="text-sm font-medium">{row.original.className} {row.original.sectionName}</span>,
    },
    {
      id: "subject",
      header: "Subject",
      accessorFn: (r) => r.subjectName,
      cell: ({ row }) =>
        drillable ? (
          <button type="button" className="text-left text-sm hover:underline" onClick={() => onOpen(row.original.syllabusPlanId, row.original.sectionId)}>
            {row.original.subjectName}
          </button>
        ) : (
          <span className="text-sm">{row.original.subjectName}</span>
        ),
    },
    { id: "teacher", header: "Teacher", accessorFn: (r) => r.teacherName ?? "", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.teacherName ?? "—"}</span> },
    {
      id: "chapters",
      header: "Chapters (done / started / pending)",
      accessorFn: (r) => r.completedChapters,
      meta: { exportValue: (r: SubjectStatus) => `${r.completedChapters}/${r.inProgressChapters}/${r.pendingChapters}` },
      cell: ({ row }) => (
        <span className="text-sm tabular-nums">
          {row.original.completedChapters} / {row.original.inProgressChapters} / {row.original.pendingChapters} <span className="text-muted-foreground">of {row.original.totalChapters}</span>
        </span>
      ),
    },
    {
      id: "percent",
      header: "Completion",
      accessorFn: (r) => r.percent,
      meta: { exportValue: (r: SubjectStatus) => r.percent },
      cell: ({ row }) => <ProgressBar percent={row.original.percent} planned={row.original.plannedPercent} risk={row.original.risk} className="min-w-44" />,
    },
    { id: "planned", header: "Planned", accessorFn: (r) => r.plannedPercent ?? -1, meta: { exportValue: (r: SubjectStatus) => r.plannedPercent ?? "" }, cell: ({ row }) => <span className="text-sm tabular-nums">{pct(row.original.plannedPercent)}</span> },
    { id: "risk", header: "Status", accessorFn: (r) => r.risk, cell: ({ row }) => <RiskBadge risk={row.original.risk} /> },
    { id: "deadline", header: "Deadline", accessorFn: (r) => r.deadline ?? "", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.deadline)}</span> },
    { id: "forecast", header: "Forecast finish", accessorFn: (r) => r.forecast ?? "", cell: ({ row }) => <span className="text-sm">{row.original.forecast ? formatDate(row.original.forecast) : "—"}</span> },
  ];
  return (
    <DataTable
      searchable
      searchPlaceholder="Search class, subject or teacher…"
      columns={columns}
      data={query.data ?? []}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      exportFileName="syllabus-completion"
      pageSize={15}
      empty={{ title: "No published syllabus matches these filters", description: "Completion appears once a syllabus is published for a class." }}
    />
  );
}

function PendingTable({ filters }: { filters: PortionFilters }) {
  const query = useQuery({ queryKey: ["portions", "pending-chapters", filters], queryFn: () => pendingChaptersReport(filters), placeholderData: (p) => p });
  const columns: ColumnDef<PendingChapter, unknown>[] = [
    { id: "chapter", header: "Chapter", accessorFn: (r) => r.chapterTitle, cell: ({ row }) => <span className="text-sm font-medium">{row.original.chapterTitle}</span> },
    { id: "class", header: "Class", accessorFn: (r) => `${r.className} ${r.sectionName}`, cell: ({ row }) => <span className="text-sm">{row.original.className} {row.original.sectionName}</span> },
    { id: "subject", header: "Subject", accessorFn: (r) => r.subjectName, cell: ({ row }) => <span className="text-sm">{row.original.subjectName}</span> },
    { id: "teacher", header: "Teacher", accessorFn: (r) => r.teacherName ?? "", cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.teacherName ?? "—"}</span> },
    { id: "status", header: "Status", accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge map={CHAPTER_STATUS} value={row.original.status} /> },
    { id: "topics", header: "Topics left", accessorFn: (r) => r.pendingTopics, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.pendingTopics}</span> },
    { id: "periods", header: "Periods left", accessorFn: (r) => r.remainingPeriods, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.remainingPeriods}</span> },
    {
      id: "deadline",
      header: "Due",
      accessorFn: (r) => r.deadline ?? "",
      cell: ({ row }) => (
        <span className="flex items-center gap-1.5 text-sm">
          {formatDate(row.original.deadline)}
          {row.original.overdue && <Badge variant="danger">Overdue</Badge>}
        </span>
      ),
    },
  ];
  return (
    <DataTable
      searchable
      columns={columns}
      data={query.data ?? []}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      exportFileName="pending-chapters"
      pageSize={15}
      empty={{ title: "Nothing pending", description: "Every chapter in these classes is complete." }}
    />
  );
}

function DelayedTable({ filters, onOpen, drillable }: { filters: PortionFilters; onOpen: (planId: string, sectionId: string) => void; drillable: boolean }) {
  const query = useQuery({ queryKey: ["portions", "delayed", filters], queryFn: () => delayedReport(filters), placeholderData: (p) => p });
  const columns: ColumnDef<DelayedSubject, unknown>[] = [
    {
      id: "subject",
      header: "Subject",
      accessorFn: (r) => `${r.status.subjectName} ${r.status.className}`,
      cell: ({ row }) => {
        const s = row.original.status;
        const body = (
          <>
            <p className="text-sm font-medium">{s.subjectName}</p>
            <p className="text-xs text-muted-foreground">
              {s.className} {s.sectionName}
              {s.teacherName ? ` · ${s.teacherName}` : ""}
            </p>
          </>
        );
        return drillable ? (
          <button type="button" className="text-left hover:underline" onClick={() => onOpen(s.syllabusPlanId, s.sectionId)}>
            {body}
          </button>
        ) : (
          <div>{body}</div>
        );
      },
    },
    { id: "status", header: "Status", accessorFn: (r) => r.status.risk, cell: ({ row }) => <RiskBadge risk={row.original.status.risk} /> },
    { id: "percent", header: "Done / planned", accessorFn: (r) => r.status.percent, meta: { exportValue: (r: DelayedSubject) => `${r.status.percent}% of ${r.status.plannedPercent ?? "?"}%` }, cell: ({ row }) => <span className="text-sm tabular-nums">{pct(row.original.status.percent)} / {pct(row.original.status.plannedPercent)}</span> },
    { id: "topics", header: "Topics left", accessorFn: (r) => r.pendingTopics, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.pendingTopics}</span> },
    { id: "action", header: "Corrective action", accessorFn: (r) => r.correctiveAction, cell: ({ row }) => <span className="text-sm">{row.original.correctiveAction}</span> },
  ];
  return (
    <DataTable
      searchable
      columns={columns}
      data={query.data ?? []}
      isLoading={query.isLoading}
      isError={query.isError}
      onRetry={() => query.refetch()}
      exportFileName="delayed-lessons"
      pageSize={15}
      empty={{ title: "Nothing is behind schedule", description: "Subjects with dates are on track." }}
    />
  );
}
