import { useMemo, useState } from "react";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowLeft, Award, BarChart3, CheckCircle2, ClipboardPenLine, Download, Printer, Send, TrendingDown, TrendingUp, UserX, Users, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatCard, StatGrid } from "@/components/ui/stat-card";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { useAuthStore } from "@/store/authStore";
import { getExamResults } from "../api";
import { formatExamTime, formatMarks, formatPercent, isExamStaff, RESULT_STATUS_LABEL, RESULT_STATUS_TONE } from "../constants";
import { downloadResultsCsv, printResults } from "../exportResults";
import type { ExamResultRow, ResultRowStatus } from "../types";
import { allowedActions, ExamStatusBadge, useExamActions } from "../components/useExamActions";
import { useTranslation } from "react-i18next";

const ALL = "__all";
const STATUSES: ResultRowStatus[] = ["Passed", "Failed", "PendingEvaluation", "InProgress", "Absent", "NotStarted"];

export default function ExamResultsPage() {
  const { t } = useTranslation("online-exams");
  const branding = useTenantBranding();
  const { id } = useParams();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.user?.role);
  const [status, setStatus] = useState<string>(ALL);
  const results = useQuery({ queryKey: ["online-exams", "results", id], queryFn: () => getExamResults(id!), enabled: !!id && isExamStaff(role) });
  const actions = useExamActions();

  const columns = useMemo<ColumnDef<ExamResultRow, unknown>[]>(
    () => [
      { accessorKey: "rollNumber", header: t("Roll"), cell: ({ row }) => <span className="tabular-nums">{row.original.rollNumber ?? "—"}</span> },
      {
        accessorKey: "studentName",
        header: t("Student"),
        cell: ({ row }) => (
          <div>
            <p className="font-medium text-foreground">{row.original.studentName}</p>
            {row.original.classLabel && <p className="text-xs text-muted-foreground">{row.original.classLabel}</p>}
          </div>
        ),
      },
      { accessorKey: "score", header: t("Score"), cell: ({ row }) => <span className="tabular-nums">{row.original.score == null ? "—" : formatMarks(row.original.score)}</span> },
      { accessorKey: "percentage", header: "%", cell: ({ row }) => <span className="tabular-nums">{formatPercent(row.original.percentage)}</span> },
      { accessorKey: "grade", header: t("Grade"), cell: ({ row }) => row.original.grade ?? "—" },
      {
        accessorKey: "status",
        header: t("Status"),
        cell: ({ row }) => (
          <Badge variant={RESULT_STATUS_TONE[row.original.status]} dot>
            {t(RESULT_STATUS_LABEL[row.original.status])}
          </Badge>
        ),
      },
      {
        accessorKey: "submittedAt",
        header: t("Submitted"),
        cell: ({ row }) => <span className="whitespace-nowrap text-muted-foreground">{row.original.submittedAt ? formatExamTime(row.original.submittedAt) : "—"}</span>,
      },
      {
        id: "open",
        header: "",
        enableSorting: false,
        cell: ({ row }) =>
          row.original.attemptId ? (
            <Button variant={row.original.status === "PendingEvaluation" ? "default" : "ghost"} size="sm" onClick={(e) => { e.stopPropagation(); navigate(`/online-exams/exams/${id}/attempts/${row.original.attemptId}`); }}>
              {row.original.status === "PendingEvaluation" ? t("Evaluate") : t("View answers")}
            </Button>
          ) : null,
      },
    ],
    [id, navigate, t],
  );

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my/results" replace />;
  if (results.isLoading) return <PageSkeleton stats={4} />;
  if (results.isError || !results.data) {
    return (
      <PageContainer>
        <ErrorState title={t("Results couldn't load")} description={results.error instanceof Error ? results.error.message : undefined} onRetry={() => results.refetch()} retrying={results.isRefetching} />
      </PageContainer>
    );
  }

  const r = results.data;
  const s = r.summary;
  const can = allowedActions(r.exam);
  const rows = status === ALL ? r.rows : r.rows.filter((row) => row.status === status);

  return (
    <PageContainer>
      <Link to={`/online-exams/exams/${r.exam.id}`} className="inline-flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        {t("Back to exam")}
      </Link>
      <PageHeader
        icon={Award}
        eyebrow={<p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t("Results")}</p>}
        title={r.exam.name}
        description={`${r.exam.subjectName ?? "—"} · ${r.exam.className ?? "—"} · ${t("Total {{total}}, pass at {{pass}}", { total: formatMarks(r.exam.totalMarks), pass: formatMarks(r.exam.passingMarks) })}`}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <ExamStatusBadge status={r.exam.status} />
            <Button variant="outline" onClick={() => navigate(`/online-exams/reports?exam=${r.exam.id}`)}>
              <BarChart3 className="h-4 w-4" />
              {t("Analysis")}
            </Button>
            <Button variant="outline" onClick={() => downloadResultsCsv(r)} disabled={r.rows.length === 0}>
              <Download className="h-4 w-4" />
              {t("Export CSV")}
            </Button>
            <Button variant="outline" onClick={() => printResults(r, branding) || toast.error(t("Allow pop-ups to print the results sheet"))} disabled={r.rows.length === 0}>
              <Printer className="h-4 w-4" />
              {t("Print")}
            </Button>
            {can.publish && (
              <Button onClick={() => actions.openPublish(r.exam)}>
                <Send className="h-4 w-4" />
                {t("Publish results")}
              </Button>
            )}
          </div>
        }
      />

      {s.pendingEvaluation > 0 && (
        <div role="status" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-sm text-warning-strong">
          <span className="flex items-center gap-2">
            <ClipboardPenLine className="h-4 w-4" />
            {s.pendingEvaluation === 1 ? t("{{n}} submission still needs marking before the scores are final.", { n: s.pendingEvaluation }) : t("{{n}} submissions still need marking before the scores are final.", { n: s.pendingEvaluation })}
          </span>
          {(() => {
            const first = r.rows.find((row) => row.status === "PendingEvaluation" && row.attemptId);
            return first ? (
              <Button size="sm" onClick={() => navigate(`/online-exams/exams/${r.exam.id}/attempts/${first.attemptId}`)}>
                {t("Start evaluating")}
              </Button>
            ) : null;
          })()}
        </div>
      )}

      <StatGrid columns={4}>
        <StatCard label={t("Students")} value={s.totalStudents} icon={Users} tone="brand" hint={t("{{appeared}} appeared · {{absent}} absent", { appeared: s.appeared, absent: s.absent })} />
        <StatCard label={t("Passed")} value={s.passed} icon={CheckCircle2} tone="success" hint={s.appeared ? t("{{percent}}% of those who appeared", { percent: Math.round((s.passed / s.appeared) * 100) }) : undefined} />
        <StatCard label={t("Failed")} value={s.failed} icon={XCircle} tone={s.failed ? "danger" : "neutral"} />
        <StatCard label={t("Average score")} value={formatMarks(s.averageScore)} icon={BarChart3} tone="info" hint={formatPercent(s.averagePercentage)} />
      </StatGrid>
      <StatGrid columns={3}>
        <StatCard label={t("Highest")} value={formatMarks(s.highestScore)} icon={TrendingUp} tone="success" />
        <StatCard label={t("Lowest")} value={formatMarks(s.lowestScore)} icon={TrendingDown} tone="warning" />
        <StatCard label={t("Absent")} value={s.absent} icon={UserX} tone="neutral" />
      </StatGrid>

      <DataTable
        columns={columns}
        data={rows}
        searchable
        searchPlaceholder={t("Search students…")}
        onRowClick={(row) => row.attemptId && navigate(`/online-exams/exams/${r.exam.id}/attempts/${row.attemptId}`)}
        empty={{ icon: Users, title: status === ALL ? t("No students assigned") : t("No students with this status") }}
        toolbar={
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[11rem]" aria-label={t("Result status")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{t("All students")}</SelectItem>
              {STATUSES.map((st) => (
                <SelectItem key={st} value={st}>
                  {t(RESULT_STATUS_LABEL[st])}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />
      {actions.dialogs}
    </PageContainer>
  );
}
