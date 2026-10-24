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
import { useTranslation } from "react-i18next";

const ALL = "__all";

/** Local date "2026-10-14" → start/end of that day as ISO, for the API's date filter. */
const dayStart = (d: string) => new Date(`${d}T00:00:00`).toISOString();
const dayEnd = (d: string) => new Date(`${d}T23:59:59`).toISOString();

export default function ExamListPage() {
  const { t } = useTranslation("online-exams");
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
        header: t("Exam"),
        cell: ({ row }) => (
          <div className="min-w-[12rem]">
            <p className="font-medium text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{t(EXAM_TYPE_LABEL[row.original.examType])} · {row.original.questionCount === 1 ? t("{{n}} question", { n: row.original.questionCount }) : t("{{n}} questions", { n: row.original.questionCount })}</p>
          </div>
        ),
      },
      { accessorKey: "subjectName", header: t("Subject"), cell: ({ row }) => row.original.subjectName ?? "—" },
      {
        id: "class",
        header: t("Class"),
        accessorFn: (e) => `${e.className ?? ""} ${e.sectionName ?? ""}`,
        cell: ({ row }) => (
          <span className="whitespace-nowrap">
            {row.original.className ?? "—"}
            <span className="text-muted-foreground"> · {row.original.sectionName ?? t("All sections")}</span>
          </span>
        ),
      },
      {
        accessorKey: "startUtc",
        header: t("Starts"),
        cell: ({ row }) => <span className="whitespace-nowrap">{formatExamTime(row.original.startUtc, row.original.timeZoneId)}</span>,
      },
      {
        accessorKey: "endUtc",
        header: t("Ends"),
        cell: ({ row }) => <span className="whitespace-nowrap">{formatExamTime(row.original.endUtc, row.original.timeZoneId)}</span>,
      },
      { accessorKey: "durationMinutes", header: t("Duration"), cell: ({ row }) => formatDuration(row.original.durationMinutes) },
      {
        accessorKey: "totalMarks",
        header: t("Marks"),
        cell: ({ row }) => (
          <span className="tabular-nums">
            {formatMarks(row.original.totalMarks)}
            <span className="text-xs text-muted-foreground"> · {t("pass {{marks}}", { marks: formatMarks(row.original.passingMarks) })}</span>
          </span>
        ),
      },
      { accessorKey: "status", header: t("Status"), cell: ({ row }) => <ExamStatusBadge status={row.original.status} /> },
      {
        accessorKey: "assignedCount",
        header: t("Students"),
        cell: ({ row }) => (
          <span className="tabular-nums" title={t("{{submitted}} submitted of {{assigned}} assigned", { submitted: row.original.submittedCount, assigned: row.original.assignedCount })}>
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
            <RowActions label={t("Actions for {{name}}", { name: row.original.name })}>{actions.menuItems(row.original)}</RowActions>
          </div>
        ),
      },
    ],
    [actions, t],
  );

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my" replace />;

  return (
    <PageContainer>
      <PageHeader
        icon={ListChecks}
        title={t("Exams")}
        description={t("Every online exam you can manage, from drafts to published results.")}
        actions={
          <Button onClick={() => navigate("/online-exams/exams/new")}>
            <Plus className="h-4 w-4" />
            {t("Create exam")}
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
        searchPlaceholder={t("Search exams…")}
        onRowClick={(e) => navigate(`/online-exams/exams/${e.id}`)}
        empty={
          filtered
            ? { icon: ListChecks, title: t("No exams match these filters"), action: <Button variant="outline" size="sm" onClick={() => setParams({}, { replace: true })}>{t("Clear filters")}</Button> }
            : {
                icon: ListChecks,
                title: t("No online exams yet"),
                description: t("Create an exam, add questions from the bank, and schedule it for a class."),
                action: <Button size="sm" onClick={() => navigate("/online-exams/exams/new")}>{t("Create exam")}</Button>,
              }
        }
        toolbar={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status ?? ALL} onValueChange={(v) => setParam("status", v)}>
              <SelectTrigger className="w-[9.5rem]" aria-label={t("Status")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("All statuses")}</SelectItem>
                {EXAM_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {t(EXAM_STATUS_LABEL[s])}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={classId ?? ALL} onValueChange={(v) => setParam("classId", v)}>
              <SelectTrigger className="w-[9rem]" aria-label={t("Class")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("All classes")}</SelectItem>
                {(classes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={subjectId ?? ALL} onValueChange={(v) => setParam("subjectId", v)}>
              <SelectTrigger className="w-[10rem]" aria-label={t("Subject")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("All subjects")}</SelectItem>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-1.5">
              <Input type="date" value={from} onChange={(e) => setParam("from", e.target.value)} className="w-[9.5rem]" aria-label={t("From date")} />
              <span className="text-xs text-muted-foreground">{t("to")}</span>
              <Input type="date" value={to} onChange={(e) => setParam("to", e.target.value)} className="w-[9.5rem]" aria-label={t("To date")} />
            </div>
            {filtered && (
              <Button variant="ghost" size="sm" onClick={() => setParams({}, { replace: true })}>
                <X className="h-3.5 w-3.5" />
                {t("Clear")}
              </Button>
            )}
          </div>
        }
      />
      {actions.dialogs}
    </PageContainer>
  );
}
