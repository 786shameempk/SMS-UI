import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Loader2, RotateCcw, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { listStudents } from "@/features/students/api";
import { formatDateTime } from "@/utils/format";
import { gradeSubmission, listSubmissionsForHomework, requestResubmission } from "../api";
import { SUBMISSION_STATUS_CONFIG } from "../constants";
import type { Homework, HomeworkSubmission } from "../types";

interface DraftRow {
  grade: string;
  feedback: string;
}

export default function SubmissionsPanel({ homework, onBack }: { homework: Homework; onBack: () => void }) {
  const queryClient = useQueryClient();

  const { data: submissions = [], isLoading: submissionsLoading } = useQuery({
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
      toast.success("Grade saved");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not save grade"),
  });

  const resubmitMutation = useMutation({
    mutationFn: ({ id, feedback }: { id: string; feedback: string }) => requestResubmission(id, feedback),
    onSuccess: () => {
      invalidate();
      toast.success("Resubmission requested");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not request resubmission"),
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
          Back to homework
        </Button>
        <div>
          <h2 className="text-base font-semibold text-slate-900">{homework.title}</h2>
          <p className="text-xs text-muted-foreground">Due {new Date(homework.dueDate).toLocaleDateString()}</p>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/60 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Submission</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Grade</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Feedback</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                    Loading submissions…
                  </td>
                </tr>
              )}
              {!isLoading && submissions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No students are eligible for this homework yet.
                  </td>
                </tr>
              )}
              {!isLoading &&
                submissions.map((s: HomeworkSubmission) => {
                  const draft = drafts[s.id] ?? { grade: "", feedback: "" };
                  const config = SUBMISSION_STATUS_CONFIG[s.status];
                  const hasContent = s.status !== "not_submitted";
                  const busy = gradeMutation.isPending || resubmitMutation.isPending;
                  return (
                    <tr key={s.id} className="border-b border-border last:border-0 align-top">
                      <td className="px-4 py-3 font-medium text-slate-800 whitespace-nowrap">{studentName(s.studentId)}</td>
                      <td className="px-4 py-3 max-w-xs">
                        {hasContent ? (
                          <>
                            <p className="text-slate-600 line-clamp-2">{s.content}</p>
                            {s.submittedAt && <p className="text-xs text-muted-foreground mt-1">Submitted {formatDateTime(s.submittedAt)}</p>}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Not submitted yet</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          className="w-24"
                          placeholder="e.g. A / 85"
                          disabled={!hasContent}
                          value={draft.grade}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...draft, grade: e.target.value } }))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <Textarea
                          className="w-56 min-h-[36px]"
                          rows={2}
                          placeholder="Feedback for the student"
                          disabled={!hasContent}
                          value={draft.feedback}
                          onChange={(e) => setDrafts((prev) => ({ ...prev, [s.id]: { ...draft, feedback: e.target.value } }))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Button
                            size="sm"
                            disabled={!hasContent || !draft.grade.trim() || busy}
                            onClick={() => gradeMutation.mutate({ id: s.id, grade: draft.grade.trim(), feedback: draft.feedback.trim() })}
                          >
                            <Save className="w-3.5 h-3.5" />
                            Save grade
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!hasContent || !draft.feedback.trim() || busy}
                            onClick={() => resubmitMutation.mutate({ id: s.id, feedback: draft.feedback.trim() })}
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Request resubmit
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
