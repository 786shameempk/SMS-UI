import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RotateCcw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { listStudents } from "@/features/students/api";
import { formatDateTime } from "@/utils/format";
import { gradeSubmission, listSubmissionsForHomework, requestResubmission } from "../api";
import { SUBMISSION_STATUS_CONFIG } from "../constants";
import type { Homework, HomeworkSubmission } from "../types";

import { useTranslation } from "react-i18next";
// Stable fallback: an inline `= []` default is a new array every render, and the drafts effect
// below depends on it — while loading (or forever, if the request fails) it would setState,
// re-render, get another new [] and loop, freezing the page. See attendance/MarkAttendanceTab.
const NO_SUBMISSIONS: HomeworkSubmission[] = [];

interface DraftRow {
  grade: string;
  feedback: string;
}

export default function SubmissionsPanel({ homework, onBack }: { homework: Homework; onBack: () => void }) {
  const { t } = useTranslation("homework");
  const queryClient = useQueryClient();

  const { data: submissions = NO_SUBMISSIONS, isLoading: submissionsLoading } = useQuery({
    queryKey: ["homework", "submissions", homework.id],
    queryFn: () => listSubmissionsForHomework(homework.id),
  });
  const { data: students = [], isLoading: studentsLoading } = useQuery({ queryKey: ["students"], queryFn: listStudents });

  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});

  useEffect(() => {
    setDrafts((prev) => {
      const next = { ...prev };
      for (const s of submissions) {
        if (!next[s.id]) next[s.id] = { grade: s.grade !== undefined ? String(s.grade) : "", feedback: s.feedback ?? "" };
      }
      return next;
    });
  }, [submissions]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["homework", "submissions", homework.id] });

  const gradeMutation = useMutation({
    mutationFn: ({ id, grade, feedback }: { id: string; grade: string; feedback: string }) =>
      gradeSubmission(id, grade, feedback || undefined),
    onSuccess: () => {
      invalidate();
      toast.success(t("Grade saved"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not save grade")),
  });

  const resubmitMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) => requestResubmission(id, feedback),
    onSuccess: () => {
      invalidate();
      toast.success(t("Resubmission requested"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not request resubmission")),
  });

  const isLoading = submissionsLoading || studentsLoading;
  const studentName = (id: string) => {
    const s = students.find((st) => st.id === id);
    return s ? `${s.firstName} ${s.lastName}` : "Unknown student";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("Back to homework")}
        </Button>
        <div>
          <h2 className="text-base font-semibold text-foreground">{homework.title}</h2>
          <p className="text-xs text-muted-foreground">{t("Due {{v1}}", { v1: new Date(homework.dueDate).toLocaleDateString() })}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-clip">
        <Table stickyHeader>
          <TableHeader>
            <TableRow hover={false}>
              <TableHead>{t("Student")}</TableHead>
              <TableHead>{t("Submission")}</TableHead>
              <TableHead>{t("Status")}</TableHead>
              <TableHead>{t("Grade")}</TableHead>
              <TableHead>{t("Feedback")}</TableHead>
              <TableHead>{t("Actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow hover={false}>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin inline me-2" />
                  {t("Loading submissions…")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading && submissions.length === 0 && (
              <TableRow hover={false}>
                <TableCell colSpan={6} className="py-10 text-center text-muted-foreground">
                  {t("No students are eligible for this homework yet.")}
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              submissions.map((s: HomeworkSubmission) => {
                const draft = drafts[s.id] ?? { grade: "", feedback: "" };
                const config = SUBMISSION_STATUS_CONFIG[s.status];
                const hasContent = s.status !== "not_submitted";
                const busy = gradeMutation.isPending || resubmitMutation.isPending;
                return (
                  <TableRow key={s.id} className="[&>td]:align-top">
                    <TableCell className="font-medium whitespace-nowrap">{studentName(s.studentId)}</TableCell>
                    <TableCell className="max-w-xs">
                      {hasContent ? (
                        <>
                          <p className="text-secondary-foreground line-clamp-2">{s.content}</p>
                          {s.submittedAt && <p className="text-xs text-muted-foreground mt-1">{t("Submitted {{v1}}", { v1: formatDateTime(s.submittedAt) })}</p>}
                        </>
                      ) : (
                        <span className="text-muted-foreground">{t("Not submitted yet")}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={config.variant}>{t(config.label)}</Badge>
                    </TableCell>
                    <TableCell>
                      <Input
                        className="w-24"
                        placeholder={t("e.g. A / 85")}
                        disabled={!hasContent}
                        value={draft.grade}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...draft, grade: e.target.value } }))}
                      />
                    </TableCell>
                    <TableCell>
                      <Textarea
                        className="w-56 min-h-[36px]"
                        rows={2}
                        placeholder={t("Feedback for the student")}
                        disabled={!hasContent}
                        value={draft.feedback}
                        onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...draft, feedback: e.target.value } }))}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1.5">
                        <Button
                          size="sm"
                          disabled={!hasContent || !draft.grade.trim() || busy}
                          onClick={() => gradeMutation.mutate({ id: s.id, grade: draft.grade.trim(), feedback: draft.feedback.trim() })}
                        >
                          <Save className="w-3.5 h-3.5" />
                          {t("Save grade")}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!hasContent || !draft.feedback.trim() || busy}
                          onClick={() => resubmitMutation.mutate({ id: s.id, feedback: draft.feedback.trim() })}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          {t("Request resubmit")}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
