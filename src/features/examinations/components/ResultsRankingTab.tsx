import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { gradeBadgeVariant } from "../constants";
import { getExamClassResults, listExams } from "../api";
import type { StudentExamSummary } from "../types";

export default function ResultsRankingTab() {
  const { data: exams = [] } = useQuery({ queryKey: ["examinations", "exams"], queryFn: listExams });
  const [examId, setExamId] = useState<string | undefined>();
  const activeExamId = examId ?? exams[0]?.id;

  const { data: results = [], isLoading } = useQuery({
    queryKey: ["examinations", "class-results", activeExamId],
    queryFn: () => getExamClassResults(activeExamId as string),
    enabled: Boolean(activeExamId),
  });

  const columns: ColumnDef<StudentExamSummary, unknown>[] = [
    {
      accessorKey: "rank",
      header: "Rank",
      cell: ({ row }) => <span className="text-sm font-semibold text-slate-800 tabular-nums">#{row.original.rank}</span>,
    },
    { accessorKey: "admissionNumber", header: "Admission No.", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.admissionNumber}</span> },
    { accessorKey: "studentName", header: "Student", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{row.original.studentName}</span> },
    { accessorKey: "section", header: "Section", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.section}</span> },
    {
      id: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 tabular-nums">
          {row.original.totalObtained} / {row.original.totalMax}
        </span>
      ),
    },
    {
      accessorKey: "percentage",
      header: "Percentage",
      cell: ({ row }) => <span className="text-sm text-slate-600 tabular-nums">{row.original.percentage}%</span>,
    },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => <Badge variant={gradeBadgeVariant(row.original.grade)}>{row.original.grade}</Badge>,
    },
    {
      accessorKey: "gpa",
      header: "GPA",
      cell: ({ row }) => <span className="text-sm text-slate-600 tabular-nums">{row.original.gpa.toFixed(2)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Results &amp; ranking</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Ranked by total marks (ties broken alphabetically). See the Report Cards tab for a per-student, per-subject breakdown.
            </p>
          </div>
          <Select value={activeExamId} onValueChange={setExamId}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select an exam" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={results}
            isLoading={isLoading}
            emptyMessage="No marks entered for this exam yet — use Marks Entry first."
          />
        </CardContent>
      </Card>
    </div>
  );
}
