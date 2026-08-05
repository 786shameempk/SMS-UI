import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listSubjects } from "@/features/academics/api";
import { getExamResults, getExamRoster, listExamSchedules, listExams, saveExamResults } from "../api";
import type { ExamResultEntryRow } from "../types";

interface DraftRow {
  marksObtained: string;
  isAbsent: boolean;
}

export default function MarksEntryTab() {
  const queryClient = useQueryClient();
  const { data: exams = [] } = useQuery({ queryKey: ["examinations", "exams"], queryFn: listExams });
  const { data: schedules = [] } = useQuery({ queryKey: ["examinations", "exam-schedules"], queryFn: () => listExamSchedules() });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });

  const [examId, setExamId] = useState<string | undefined>();
  const [subjectId, setSubjectId] = useState<string | undefined>();

  const examSchedules = useMemo(() => schedules.filter((s) => s.examId === examId), [schedules, examId]);
  const schedule = useMemo(() => examSchedules.find((s) => s.subjectId === subjectId), [examSchedules, subjectId]);

  const { data: roster = [], isLoading: rosterLoading } = useQuery({
    queryKey: ["examinations", "roster", examId],
    queryFn: () => getExamRoster(examId as string),
    enabled: Boolean(examId),
  });

  const { data: existingResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ["examinations", "exam-results", examId, subjectId],
    queryFn: () => getExamResults(examId as string, subjectId),
    enabled: Boolean(examId && subjectId),
  });

  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});

  useEffect(() => {
    if (!schedule) {
      setDrafts({});
      return;
    }
    const next: Record<string, DraftRow> = {};
    for (const student of roster) {
      const existing = existingResults.find((r) => r.studentId === student.id);
      next[student.id] = {
        marksObtained: existing && !existing.isAbsent ? String(existing.marksObtained) : "",
        isAbsent: existing?.isAbsent ?? false,
      };
    }
    setDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, existingResults, schedule?.id]);

  const saveMutation = useMutation({
    mutationFn: (rows: ExamResultEntryRow[]) => saveExamResults(examId as string, subjectId as string, schedule?.maxMarks ?? 0, rows),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examinations", "exam-results", examId, subjectId] });
      queryClient.invalidateQueries({ queryKey: ["examinations", "class-results", examId] });
      toast.success("Marks saved");
    },
    onError: () => toast.error("Could not save marks"),
  });

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "Unknown subject";

  const handleSave = () => {
    if (!schedule) return;
    const rows: ExamResultEntryRow[] = roster.map((student) => {
      const draft = drafts[student.id] ?? { marksObtained: "", isAbsent: false };
      return {
        studentId: student.id,
        marksObtained: draft.isAbsent ? 0 : Number(draft.marksObtained) || 0,
        isAbsent: draft.isAbsent,
      };
    });
    saveMutation.mutate(rows);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Select exam and subject</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="space-y-1.5 w-64">
            <Select
              value={examId}
              onValueChange={(v) => {
                setExamId(v);
                setSubjectId(undefined);
              }}
            >
              <SelectTrigger>
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
          </div>
          <div className="space-y-1.5 w-64">
            <Select value={subjectId} onValueChange={setSubjectId} disabled={!examId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {examSchedules.map((s) => (
                  <SelectItem key={s.id} value={s.subjectId}>
                    {subjectName(s.subjectId)} &middot; {s.date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {schedule && (
        <Card>
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div>
              <CardTitle>
                {subjectName(schedule.subjectId)} &middot; Max marks {schedule.maxMarks} &middot; Pass marks {schedule.passMarks}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Enter marks for each student, or mark them absent. Marks are clamped to the max.</p>
            </div>
            <Button onClick={handleSave} disabled={saveMutation.isPending || rosterLoading || resultsLoading || roster.length === 0}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save marks
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-secondary/60 border-b border-border">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Admission No.</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Student</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Section</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Marks obtained</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Absent</th>
                    </tr>
                  </thead>
                  <tbody>
                    {roster.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                          No students found in this exam's class.
                        </td>
                      </tr>
                    )}
                    {roster.map((student) => {
                      const draft = drafts[student.id] ?? { marksObtained: "", isAbsent: false };
                      return (
                        <tr key={student.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2.5 text-slate-600">{student.admissionNumber}</td>
                          <td className="px-4 py-2.5 font-medium text-slate-800">
                            {student.firstName} {student.lastName}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{student.section}</td>
                          <td className="px-4 py-2.5">
                            <Input
                              type="number"
                              min={0}
                              max={schedule.maxMarks}
                              className="w-28"
                              disabled={draft.isAbsent}
                              value={draft.marksObtained}
                              onChange={(e) =>
                                setDrafts((prev) => ({ ...prev, [student.id]: { ...draft, marksObtained: e.target.value } }))
                              }
                            />
                          </td>
                          <td className="px-4 py-2.5">
                            <Checkbox
                              checked={draft.isAbsent}
                              onCheckedChange={(checked) =>
                                setDrafts((prev) => ({ ...prev, [student.id]: { ...draft, isAbsent: Boolean(checked) } }))
                              }
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
