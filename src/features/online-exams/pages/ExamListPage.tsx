import { useMemo } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ListChecks, Plus, X } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { RowActions } from "@/components/ui/row-actions";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listClasses, listSubjects } from "@/features/academics/api";
import { useAuthStore } from "@/store/authStore";
import { listOnlineExams } from "../api";
import { EXAM_STATUS_LABEL, EXAM_STATUSES, EXAM_TYPE_LABEL, formatDuration, formatExamTime, formatMarks, isExamStaff } from "../constants";
import type { ExamFilters, OnlineExamListItem, OnlineExamStatus } from "../types";
import { ExamStatusBadge, useExamActions } from "../components/useExamActions";

const ALL = "__all";

/** Local date "2026-10-14" → start/end of that day as ISO, for the API's date filter. */
const dayStart = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const dayEnd = (d: string) => new Date(`${d}T23:59:59`).toISOString();

export default function ExamListPage() {
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const actions = useExamActions();

  const status = (params.get("status") as OnlineExamStatus | null) ?? undefined;
  const classId = params.get("classId") ?? undefined;
  const subjectId = params.get("subjectId") ?? undefined;
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const filters: ExamFilters = { status, classId, subjectId, from: from ? dayStart(from) : undefined, to: to ? dayEnd(to) : undefined };

  const exams = useQuery({ queryKey: ["online-exams", "list", filters], queryFn: () => listOnlineExams(filters), enabled: isExamStaff(role) });
  const classes = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const subjects = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });

  const setParam = (key: string, value: string | undefined) => {
    const next = new URLSearchParams(params);
    if (value && value !== ALL) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };
  const filtered = !!(status || classId || subjectId || from || to);

  const columns = useMemo<ColumnDef<OnlineExamListItem, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Exam",
        cell: ({ row }) => (
          <div className="min-w-[12rem]">
            <p className="font-medium text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{EXAM_TYPE_LABEL[row.original.examType]} · {row.original.questionCount} question{row.original.questionCount === 1 ? "" : "s"}</p>
          </div>
        ),
      },
      { accessorKey: "subjectName", header: "Subject", cell: ({ row }) => row.original.subjectName ?? "—" },
      {
        id: "class",
        header: "Class",
        accessorFn: (e) => `${e.className ?? ""} ${e.sectionName ?? ""}`,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.className ?? "—"}
            <span className="text-muted-foreground"> · {row.original.sectionName ?? "All sections"}</span>
          </span>
        ),
      },
      {
        accessorKey: "startUtc",
        header: "Starts",
        cell: ({ row }) => <span className="whitespace-nowrap">{formatExamTime(row.original.startUtc, row.original.timeZoneId)}</span>,
      },
      {
        accessorKey: "endUtc",
        header: "Ends",
        cell: ({ row }) => <span className="whitespace-nowrap">{formatExamTime(row.original.endUtc, row.original.timeZoneId)}</span>,
      },
      { accessorKey: "durationMinutes", header: "Duration", cell: ({ row }) => formatDuration(row.original.durationMinutes) },
      {
        accessorKey: "totalMarks",
        header: "Marks",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMarks(row.original.totalMarks)}
            <span className="text-xs text-muted-foreground"> · pass {formatMarks(row.original.passingMarks)}</span>
          </span>
        ),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <ExamStatusBadge status={row.original.status} /> },
      {
        accessorKey: "assignedCount",
        header: "Students",
        cell: ({ row }) => (
          <span className="tabular-nums" title={`${row.original.submittedCount} submitted of ${row.original.assignedCount} assigned`}>
            {row.original.submittedCount}/{row.original.assignedCount}
          </span>
        ),
      },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions label={`Actions for ${row.original.name}`}>{actions.menuItems(row.original)}</RowActions>
          </div>
        ),
      },
    ],
    [actions],
  );

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my" replace />;

  return (
    <PageContainer>
      <PageHeader
        icon={ListChecks}
        title="Exams"
        description="Every online exam you can manage, from drafts to published results."
        actions={
          <Button onClick={() => navigate("/online-exams/exams/new")}>
            <Plus className="h-4 w-4" />
            Create exam
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={exams.data ?? []}
        isLoading={exams.isLoading}
        isError={exams.isError}
        onRetry={() => exams.refetch()}
        searchable
        searchPlaceholder="Search exams…"
        onRowClick={(e) => navigate(`/online-exams/exams/${e.id}`)}
        empty={
          filtered
            ? { icon: ListChecks, title: "No exams match these filters", action: <Button variant="outline" size="sm" onClick={() => setParams({}, { replace: true })}>Clear filters</Button> }
            : {
                icon: ListChecks,
                title: "No online exams yet",
                description: "Create an exam, add questions from the bank, and schedule it for a class.",
                action: <Button size="sm" onClick={() => navigate("/online-exams/exams/new")}>Create exam</Button>,
              }
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status ?? ALL} onValueChange={(v) => setParam("status", v)}>
              <SelectTrigger className="w-[9.5rem]" aria-label="Status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {EXAM_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {EXAM_STATUS_LABEL[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={classId ?? ALL} onValueChange={(v) => setParam("classId", v)}>
              <SelectTrigger className="w-[9rem]" aria-label="Class">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All classes</SelectItem>
                {(classes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subjectId ?? ALL} onValueChange={(v) => setParam("subjectId", v)}>
              <SelectTrigger className="w-[10rem]" aria-label="Subject">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All subjects</SelectItem>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Input type="date" value={from} onChange={(e) => setParam("from", e.target.value)} className="w-[9.5rem]" aria-label="From date" />
              <span className="text-xs text-muted-foreground">to</span>
              <Input type="date" value={to} onChange={(e) => setParam("to", e.target.value)} className="w-[9.5rem]" aria-label="To date" />
            </div>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        }
      />
      {actions.dialogs}
    </PageContainer>
  );
}
