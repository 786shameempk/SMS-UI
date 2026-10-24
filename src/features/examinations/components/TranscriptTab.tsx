import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/tables/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StudentPerformanceCard from "@/features/ai/components/analysis/StudentPerformanceCard";
import { listStudents } from "@/features/students/api";
import { useAuthStore } from "@/store/authStore";
import { useAiCapabilities } from "@/features/ai/capabilities";
import { EXAM_TYPE_LABELS, gradeBadgeVariant } from "../constants";
import { getTranscript } from "../api";
import type { TranscriptRow } from "../types";

import { useTranslation } from "react-i18next";
export default function TranscriptTab() {
  const { t } = useTranslation("examinations");
  const { data: students = [] } = useQuery({ queryKey: ["examinations", "all-students"], queryFn: listStudents });
  const [studentId, setStudentId] = useState<string | undefined>();
  // The school and role include AI Features (same rule as the nav), and the AI service can run this feature.
  const aiModule = useAuthStore((s) => !s.modulePermissions || s.modulePermissions.aiFeatures);
  const { can: canAi } = useAiCapabilities();
  const canUseAi = aiModule && canAi("analyze-performance");

  const { data: transcript, isLoading, isError, refetch } = useQuery({
    queryKey: ["examinations", "transcript", studentId],
    queryFn: () => getTranscript(studentId as string),
    enabled: Boolean(studentId),
  });

  const columns: ColumnDef<TranscriptRow, unknown>[] = [
    { accessorKey: "examName", header: t("Exam"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.examName}</span> },
    {
      id: "type",
      header: t("Type"),
      cell: ({ row }) => <Badge variant="info">{EXAM_TYPE_LABELS[row.original.examType]}</Badge>,
    },
    { accessorKey: "termName", header: t("Term"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.termName}</span> },
    { accessorKey: "academicYearName", header: t("Academic year"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.academicYearName}</span> },
    {
      id: "total",
      header: t("Total"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground tabular-nums">
          {row.original.totalObtained} / {row.original.totalMax}
        </span>
      ),
    },
    { accessorKey: "percentage", header: t("Percentage"), cell: ({ row }) => <span className="text-sm text-secondary-foreground tabular-nums">{row.original.percentage}%</span> },
    {
      accessorKey: "grade",
      header: t("Grade"),
      cell: ({ row }) => <Badge variant={gradeBadgeVariant(row.original.grade)}>{row.original.grade}</Badge>,
    },
    { accessorKey: "gpa", header: t("GPA"), cell: ({ row }) => <span className="text-sm text-secondary-foreground tabular-nums">{row.original.gpa.toFixed(2)}</span> },
  ];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>{t("Transcript")}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t("Full academic history across all exams and terms for the selected student.")}</p>
          </div>
          <div className="flex items-center gap-4">
            {transcript && (
              <div className="text-end">
                <p className="text-xs text-muted-foreground uppercase tracking-wide">{t("CGPA (current academic year)")}</p>
                <p className="text-lg font-bold text-foreground tabular-nums">{transcript.cgpa.toFixed(2)}</p>
              </div>
            )}
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder={t("Select a student")} />
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
          <DataTable searchable
            columns={columns}
            data={transcript?.rows ?? []}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            emptyMessage={studentId ? t("No exam results recorded for this student yet.") : t("Select a student to view their transcript.")}
          />
        </CardContent>
      </Card>

      {/* Keyed by student so switching students never shows the previous student's summary. */}
      {canUseAi && studentId && (transcript?.rows.length ?? 0) > 0 && <StudentPerformanceCard key={studentId} studentId={studentId} />}
    </div>
  );
}
