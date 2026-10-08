import { useMemo } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Award } from "lucide-react";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { RowActions } from "@/components/ui/row-actions";
import { useAuthStore } from "@/store/authStore";
import { listOnlineExams } from "../api";
import { formatExamTime, formatMarks, isExamStaff } from "../constants";
import type { OnlineExamListItem } from "../types";
import { allowedActions, ExamStatusBadge, useExamActions } from "../components/useExamActions";

export default function ResultsHubPage() {
  const role = useAuthStore((s) => s.user?.role);
  const navigate = useNavigate();
  const exams = useQuery({ queryKey: ["online-exams", "list", {}], queryFn: () => listOnlineExams(), enabled: isExamStaff(role) });
  const actions = useExamActions();

  const data = useMemo(
    () => (exams.data ?? []).filter((e) => allowedActions(e).results).sort((a, b) => Date.parse(b.endUtc) - Date.parse(a.endUtc)),
    [exams.data],
  );

  const columns = useMemo<ColumnDef<OnlineExamListItem, unknown>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Exam",
        cell: ({ row }) => (
          <div className="min-w-[12rem]">
            <p className="font-medium text-foreground">{row.original.name}</p>
            <p className="text-xs text-muted-foreground">{[row.original.subjectName, row.original.className].filter(Boolean).join(" · ")}</p>
          </div>
        ),
      },
      { accessorKey: "endUtc", header: "Closed", cell: ({ row }) => <span className="whitespace-nowrap">{formatExamTime(row.original.endUtc, row.original.timeZoneId)}</span> },
      { accessorKey: "totalMarks", header: "Marks", cell: ({ row }) => <span className="tabular-nums">{formatMarks(row.original.totalMarks)}</span> },
      {
        accessorKey: "submittedCount",
        header: "Appeared",
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.submittedCount}/{row.original.assignedCount}
          </span>
        ),
      },
      {
        accessorKey: "pendingEvaluationCount",
        header: "To mark",
        cell: ({ row }) => (row.original.pendingEvaluationCount ? <Badge variant="warning" dot>{row.original.pendingEvaluationCount}</Badge> : <span className="text-muted-foreground">—</span>),
      },
      { accessorKey: "status", header: "Status", cell: ({ row }) => <ExamStatusBadge status={row.original.status} /> },
      {
        id: "actions",
        header: "",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
            {allowedActions(row.original).publish && (
              <Button size="sm" variant="outline" onClick={() => actions.openPublish(row.original)}>
                Publish
              </Button>
            )}
            <RowActions label={`Actions for ${row.original.name}`}>{actions.menuItems(row.original)}</RowActions>
          </div>
        ),
      },
    ],
    [actions],
  );

  if (!isExamStaff(role)) return <Navigate to="/online-exams/my/results" replace />;

  return (
    <PageContainer>
      <PageHeader icon={Award} title="Results" description="Scores for every exam that's open or finished. Publish results to share them with students." />
      <DataTable
        columns={columns}
        data={data}
        isLoading={exams.isLoading}
        isError={exams.isError}
        onRetry={() => exams.refetch()}
        searchable
        searchPlaceholder="Search exams…"
        onRowClick={(e) => navigate(`/online-exams/exams/${e.id}/results`)}
        empty={{ icon: Award, title: "No results yet", description: "Results appear here once an exam opens and students submit." }}
      />
      {actions.dialogs}
    </PageContainer>
  );
}
