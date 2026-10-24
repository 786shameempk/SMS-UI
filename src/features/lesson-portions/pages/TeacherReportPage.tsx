import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/components/tables/DataTable";
import { completionReport, teacherReport } from "../api";
import { FilterBar, ProgressBar, RiskBadge, formatDate, pct, todayIso, addDays, useReferenceData } from "../shared";
import type { PortionFilters, TeacherProgress } from "../types";
import { PrintButton } from "./TrackingPage";

import { useTranslation } from "react-i18next";
export default function TeacherReportPage() {
  const { t } = useTranslation("lesson-portions");
  const data = useReferenceData({ teachers: true });
  const [filters, setFilters] = useState<PortionFilters>({ from: addDays(todayIso(), -30), to: todayIso() });
  const [open, setOpen] = useState<TeacherProgress | null>(null);
  const query = useQuery({ queryKey: ["portions", "teacher-report", filters], queryFn: () => teacherReport(filters), placeholderData: (p) => p });

  const columns: ColumnDef<TeacherProgress, unknown>[] = [
    {
      id: "teacher",
      header: t("Teacher"),
      accessorFn: (r) => r.teacherName,
      cell: ({ row }) =>
        row.original.staffId ? (
          <button type="button" className="text-start text-sm font-medium hover:underline" onClick={() => setOpen(row.original)}>
            {row.original.teacherName}
          </button>
        ) : (
          <span className="text-sm text-muted-foreground">{row.original.teacherName}</span>
        ),
    },
    { id: "assignments", header: t("Classes and subjects"), accessorFn: (r) => r.assignments, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.assignments}</span> },
    { id: "percent", header: t("Average completion"), accessorFn: (r) => r.percent, meta: { exportValue: (r: TeacherProgress) => r.percent }, cell: ({ row }) => <ProgressBar percent={row.original.percent} planned={row.original.plannedPercent} className="min-w-44" /> },
    { id: "planned", header: t("Planned"), accessorFn: (r) => r.plannedPercent ?? -1, meta: { exportValue: (r: TeacherProgress) => r.plannedPercent ?? "" }, cell: ({ row }) => <span className="text-sm tabular-nums">{pct(row.original.plannedPercent)}</span> },
    { id: "behind", header: t("Behind"), accessorFn: (r) => r.behindCount, cell: ({ row }) => (row.original.behindCount > 0 ? <Badge variant="danger">{row.original.behindCount}</Badge> : <span className="text-sm text-muted-foreground">0</span>) },
    { id: "inRange", header: t("Topics completed (period)"), accessorFn: (r) => r.topicsCompletedInRange, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.topicsCompletedInRange}</span> },
    { id: "periods", header: t("Periods used (period)"), accessorFn: (r) => r.periodsUsed, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.periodsUsed}</span> },
    { id: "total", header: t("Topics completed (all)"), accessorFn: (r) => r.topicsCompleted, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.topicsCompleted}</span> },
    { id: "last", header: t("Last update"), accessorFn: (r) => r.lastUpdatedOn ?? "", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.lastUpdatedOn)}</span> },
    { id: "pending", header: t("Outstanding updates"), accessorFn: (r) => r.pendingUpdates, cell: ({ row }) => (row.original.pendingUpdates > 0 ? <Badge variant="warning">{row.original.pendingUpdates}</Badge> : <span className="text-sm text-muted-foreground">0</span>) },
  ];

  return (
    <div className="space-y-4">
      <FilterBar value={filters} onChange={setFilters} data={data} show={["year", "term", "class", "subject", "teacher", "range"]} />
      <div className="flex justify-end">
        <PrintButton />
      </div>
      <DataTable
        searchable
        searchPlaceholder="Search teachers…"
        columns={columns}
        data={query.data ?? []}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        exportFileName="teacher-progress"
        pageSize={15}
        empty={{ title: t("No teachers match these filters"), description: t("Teachers appear once a published syllabus is taught by them in the timetable or their subject assignments.") }}
      />
      <TeacherDetail teacher={open} filters={filters} onClose={() => setOpen(null)} />
    </div>
  );
}

function TeacherDetail({ teacher, filters, onClose }: { teacher: TeacherProgress | null; filters: PortionFilters; onClose: () => void }) {
  const { t } = useTranslation("lesson-portions");
  const query = useQuery({
    queryKey: ["portions", "teacher-detail", teacher?.staffId, filters.academicYearId, filters.termId],
    queryFn: () => completionReport({ academicYearId: filters.academicYearId, termId: filters.termId, staffId: teacher!.staffId! }),
    enabled: Boolean(teacher?.staffId),
  });
  return (
    <Dialog open={Boolean(teacher)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{teacher?.teacherName}</DialogTitle>
          <DialogDescription>{t("Classes and subjects this teacher is responsible for.")}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          {query.isLoading && <Skeleton className="h-32 w-full" />}
          <ul className="divide-y divide-border">
            {query.data?.map((s) => (
              <li key={`${s.syllabusPlanId}-${s.sectionId}`} className="space-y-1 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {s.subjectName} <span className="font-normal text-muted-foreground">· {s.className} {s.sectionName}</span>
                  </p>
                  <RiskBadge risk={s.risk} />
                </div>
                <ProgressBar percent={s.percent} planned={s.plannedPercent} risk={s.risk} />
              </li>
            ))}
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
