import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listStudents } from "@/features/students/api";
import { EXAM_TYPE_LABELS, gradeBadgeVariant } from "../constants";
import { getTranscript } from "../api";
import type { TranscriptRow } from "../types";

export default function TranscriptTab() {
  const { data: students = [] } = useQuery({ queryKey: ["examinations", "all-students"], queryFn: listStudents });
  const [studentId, setStudentId] = useState<string | undefined>();

  const { data: transcript, isLoading } = useQuery({
    queryKey: ["examinations", "transcript", studentId],
    queryFn: () => getTranscript(studentId as string),
    enabled: Boolean(studentId),
  });

  const columns: ColumnDef<TranscriptRow, unknown>[] = [
    { accessorKey: "examName", header: "Exam", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{row.original.examName}</span> },
    {
      id: "type",
      header: "Type",
      cell: ({ row }) => <Badge variant="info">{EXAM_TYPE_LABELS[row.original.examType]}</Badge>,
    },
    { accessorKey: "termName", header: "Term", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.termName}</span> },
    { accessorKey: "academicYearName", header: "Academic year", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.academicYearName}</span> },
    {
      id: "total",
      header: "Total",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600 tabular-nums">
          {row.original.totalObtained} / {row.original.totalMax}
        </span>
      ),
    },
    { accessorKey: "percentage", header: "Percentage", cell: ({ row }) => <span className="text-sm text-slate-600 tabular-nums">{row.original.percentage}%</span> },
    {
      accessorKey: "grade",
      header: "Grade",
      cell: ({ row }) => <Badge variant={gradeBadgeVariant(row.original.grade)}>{row.original.grade}</Badge>,
    },
    { accessorKey: "gpa", header: "GPA", cell: ({ row }) => <span className="text-sm text-slate-600 tabular-nums">{row.original.gpa.toFixed(2)}</span> },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>Transcript</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Full academic history across all exams and terms for the selected student.</p>
          </div>
          <div className="flex items-center gap-4">
            {transcript && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">CGPA (current academic year)</p>
                <p className="text-lg font-bold text-slate-900 tabular-nums">{transcript.cgpa.toFixed(2)}</p>
              </div>
            )}
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} ({s.admissionNumber})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={transcript?.rows ?? []}
            isLoading={isLoading}
            emptyMessage={studentId ? "No exam results recorded for this student yet." : "Select a student to view their transcript."}
          />
        </CardContent>
      </Card>
    </div>
  );
}
