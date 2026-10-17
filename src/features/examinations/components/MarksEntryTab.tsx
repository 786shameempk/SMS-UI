import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listSubjects } from "@/features/academics/api";
import { getExamResults, getExamRoster, listExamSchedules, listExams, saveExamResults } from "../api";
import type { ExamResultEntryRow } from "../types";

// Stable fallback: an inline `= []` default is a new array every render, and the drafts effect
// below depends on it — while loading (or forever, if the request fails) it would setState,
// re-render, get another new [] and loop, freezing the page. See attendance/MarkAttendanceTab.
const NO_ROSTER: Awaited<ReturnType<typeof getExamRoster>> = [];
const NO_RESULTS: Awaited<ReturnType<typeof getExamResults>> = [];

interface DraftRow {
  /** Total marks (subjects without an internal component). */
  marksObtained: string;
  /** Subjects with an internal (CE) component: the two parts are entered separately. */
  internalMarks: string;
  externalMarks: string;
  isAbsent: boolean;
}

const EMPTY_DRAFT: DraftRow = { marksObtained: "", internalMarks: "", externalMarks: "", isAbsent: false };

export default function MarksEntryTab() {
  const queryClient = useQueryClient();
  const { data: exams = [] } = useQuery({ queryKey: ["examinations", "exams"], queryFn: listExams });
  const { data: schedules = [] } = useQuery({ queryKey: ["examinations", "exam-schedules"], queryFn: () => listExamSchedules() });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });

  const [examId, setExamId] = useState<string | undefined>();
  const [subjectId, setSubjectId] = useState<string | undefined>();

  const examSchedules = useMemo(() => schedules.filter((s) => s.examId === examId), [schedules, examId]);
  const schedule = useMemo(() => examSchedules.find((s) => s.subjectId === subjectId), [examSchedules, subjectId]);

  const { data: roster = NO_ROSTER, isLoading: rosterLoading } = useQuery({
    queryKey: ["examinations", "roster", examId],
    queryFn: () => getExamRoster(examId as string),
    enabled: Boolean(examId),
  });

  const { data: existingResults = NO_RESULTS, isLoading: resultsLoading } = useQuery({
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
      const entered = existing && !existing.isAbsent;
      next[student.id] = {
        marksObtained: entered ? String(existing.marksObtained) : "",
        internalMarks: entered && existing.internalMarks != null ? String(existing.internalMarks) : "",
        externalMarks: entered && existing.internalMarks != null ? String(existing.marksObtained - existing.internalMarks) : "",
        isAbsent: existing?.isAbsent ?? false,
      };
    }
    setDrafts(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roster, existingResults, schedule?.id]);

  const saveMutation = useMutation({
    mutationFn: (rows: ExamResultEntryRow[]) => saveExamResults(examId as string, subjectId as string, schedule?.maxMarks ?? 0, rows, schedule?.internalMaxMarks),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["examinations", "exam-results", examId, subjectId] });
      queryClient.invalidateQueries({ queryKey: ["examinations", "class-results", examId] });
      toast.success("Marks saved");
    },
    onError: () => toast.error("Could not save marks"),
  });

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "Unknown subject";

  const internalMax = schedule?.internalMaxMarks ?? 0;
  const externalMax = (schedule?.maxMarks ?? 0) - internalMax;
  const hasInternal = internalMax > 0;
  const clamp = (value: string, max: number) => Math.min(max, Math.max(0, Number(value) || 0));

  const handleSave = () => {
    if (!schedule) return;
    const rows: ExamResultEntryRow[] = roster.map((student) => {
      const draft = drafts[student.id] ?? EMPTY_DRAFT;
      if (hasInternal) {
        const internalMarks = draft.isAbsent ? 0 : clamp(draft.internalMarks, internalMax);
        const externalMarks = draft.isAbsent ? 0 : clamp(draft.externalMarks, externalMax);
        return { studentId: student.id, marksObtained: internalMarks + externalMarks, internalMarks, externalMarks, isAbsent: draft.isAbsent };
      }
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
                {subjectName(schedule.subjectId)} &middot; Max marks {schedule.maxMarks}
                {hasInternal && ` (internal ${internalMax} + actual ${externalMax})`} &middot; Pass marks {schedule.passMarks}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{hasInternal
                  ? "Enter the internal (CE) mark and the actual mark separately; the total is worked out for you. Each is clamped to its own max."
                  : "Enter marks for each student, or mark them absent. Marks are clamped to the max."}</p>
            </div>
            <Button onClick={handleSave} disabled={saveMutation.isPending || rosterLoading || resultsLoading || roster.length === 0}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save marks
            </Button>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border overflow-clip">
              <Table stickyHeader>
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead>Admission No.</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Section</TableHead>
                    {hasInternal ? (
                      <>
                        <TableHead>Internal (CE) /{internalMax}</TableHead>
                        <TableHead>Actual /{externalMax}</TableHead>
                        <TableHead>Total /{schedule.maxMarks}</TableHead>
                      </>
                    ) : (
                      <TableHead>Marks obtained</TableHead>
                    )}
                    <TableHead>Absent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.length === 0 && (
                    <TableRow hover={false}>
                      <TableCell colSpan={hasInternal ? 7 : 5} className="py-10 text-center text-muted-foreground">
                        No students found in this exam's class.
                      </TableCell>
                    </TableRow>
                  )}
                  {roster.map((student) => {
                    const draft = drafts[student.id] ?? EMPTY_DRAFT;
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="text-secondary-foreground">{student.admissionNumber}</TableCell>
                        <TableCell className="font-medium">
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell className="text-secondary-foreground">{student.section}</TableCell>
                        {hasInternal ? (
                          <>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={internalMax}
                                className="w-24"
                                aria-label={`Internal marks for ${student.firstName} ${student.lastName}`}
                                disabled={draft.isAbsent}
                                value={draft.internalMarks}
                                onChange={(e) => setDrafts((prev) => ({ ...prev, [student.id]: { ...draft, internalMarks: e.target.value } }))}
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={externalMax}
                                className="w-24"
                                aria-label={`Actual marks for ${student.firstName} ${student.lastName}`}
                                disabled={draft.isAbsent}
                                value={draft.externalMarks}
                                onChange={(e) => setDrafts((prev) => ({ ...prev, [student.id]: { ...draft, externalMarks: e.target.value } }))}
                              />
                            </TableCell>
                            <TableCell className="font-medium tabular-nums">
                              {draft.isAbsent ? "AB" : clamp(draft.internalMarks, internalMax) + clamp(draft.externalMarks, externalMax)}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell>
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
                          </TableCell>
                        )}
                        <TableCell>
                          <Checkbox
                            checked={draft.isAbsent}
                            onCheckedChange={(checked) =>
                              setDrafts((prev) => ({ ...prev, [student.id]: { ...draft, isAbsent: Boolean(checked) } }))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
