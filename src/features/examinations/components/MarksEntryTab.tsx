import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listSubjects } from "@/features/academics/api";
import { extractApiErrorMessage } from "@/lib/httpClient";
import { NativeSelect } from "@/components/ui/native-select";
import { getExamResults, getExamRoster, getMarksProgress, listExamSchedules, listExams, reopenMarks, saveExamResults, submitMarks } from "../api";
import type { Exemption, ExamResultEntryRow } from "../types";

import { useTranslation } from "react-i18next";
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
  /** Subjects with assessment components: the typed mark per component key. */
  components: Record<string, string>;
  /** Exempt or not applicable: no marks, left out of totals. */
  exemption: "" | Exemption;
  isAbsent: boolean;
}

const EMPTY_DRAFT: DraftRow = { marksObtained: "", internalMarks: "", externalMarks: "", components: {}, exemption: "", isAbsent: false };

export default function MarksEntryTab() {
  const { t } = useTranslation("examinations");
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

  const { data: progress = [] } = useQuery({ queryKey: ["examinations", "marks-progress", examId], queryFn: () => getMarksProgress(examId as string), enabled: Boolean(examId) });
  const mine = progress.find((p) => p.subjectId === subjectId);
  const submitted = mine?.status === "Submitted";
  const refreshProgress = () => {
    queryClient.invalidateQueries({ queryKey: ["examinations", "marks-progress", examId] });
    queryClient.invalidateQueries({ queryKey: ["examinations", "exam-schedules"] });
  };

  useEffect(() => {
    if (!schedule) {
      setDrafts({});
      return;
    }
    const next: Record<string, DraftRow> = {};
    for (const student of roster) {
      const existing = existingResults.find((r) => r.studentId === student.id);
      const entered = existing && !existing.isAbsent && !existing.exemption;
      next[student.id] = {
        marksObtained: entered ? String(existing.marksObtained) : "",
        internalMarks: entered && existing.internalMarks != null ? String(existing.internalMarks) : "",
        externalMarks: entered && existing.internalMarks != null ? String(existing.marksObtained - existing.internalMarks) : "",
        components: entered && existing.componentMarks ? Object.fromEntries(Object.entries(existing.componentMarks).map(([k, v]) => [k, String(v)])) : {},
        exemption: existing?.exemption ?? "",
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
      refreshProgress();
      toast.success(t("Marks saved as a draft"));
    },
    onError: (e) => toast.error(extractApiErrorMessage(e, t("Could not save marks"))),
  });
  const submitMutation = useMutation({
    mutationFn: () => submitMarks(examId as string, subjectId as string),
    onSuccess: () => { refreshProgress(); toast.success(t("Marks submitted")); },
    onError: (e) => toast.error(extractApiErrorMessage(e, t("Could not submit marks"))),
  });
  const reopenMutation = useMutation({
    mutationFn: () => reopenMarks(examId as string, subjectId as string),
    onSuccess: () => { refreshProgress(); toast.success(t("Marks reopened")); },
    onError: (e) => toast.error(extractApiErrorMessage(e, t("Could not reopen marks"))),
  });

  const subjectName = (id: string) => subjects.find((s) => s.id === id)?.name ?? "Unknown subject";

  const comps = schedule?.components ?? [];
  const hasComponents = comps.length > 0;
  const clampTo = (value: string | undefined, max: number) => Math.min(max, Math.max(0, Math.round((Number(value) || 0) * 100) / 100));
  const componentTotal = (draft: DraftRow) => Math.round(comps.filter((c) => c.counts).reduce((sum, c) => sum + clampTo(draft.components[c.key], c.max), 0) * 100) / 100;

  /** Arrow keys and Enter move between mark cells (up/down by student, left/right by component) so a class can be keyed in without the mouse. */
  const moveFocus = (e: React.KeyboardEvent<HTMLInputElement>, row: number, col: number) => {
    const delta: Record<string, [number, number]> = { ArrowDown: [1, 0], Enter: [1, 0], ArrowUp: [-1, 0], ArrowRight: [0, 1], ArrowLeft: [0, -1] };
    const step = delta[e.key];
    if (!step) return;
    const next = document.querySelector<HTMLInputElement>(`input[data-cell="${row + step[0]}:${col + step[1]}"]:not(:disabled)`);
    if (next) {
      e.preventDefault();
      next.focus();
      next.select();
    }
  };

  /** Pastes a block copied from a spreadsheet (tabs between components, new lines between students) starting at the focused cell. */
  const pasteBlock = (e: React.ClipboardEvent<HTMLInputElement>, row: number, col: number) => {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\t") && !text.includes("\n")) return; // a single value pastes normally
    e.preventDefault();
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.length > 0);
    setDrafts((prev) => {
      const next = { ...prev };
      lines.forEach((line, li) => {
        const student = roster[row + li];
        if (!student) return;
        const base = next[student.id] ?? EMPTY_DRAFT;
        const components = { ...base.components };
        line.split("\t").forEach((cell, ci) => {
          const c = comps[col + ci];
          if (c && cell.trim() !== "" && !Number.isNaN(Number(cell))) components[c.key] = String(clampTo(cell, c.max));
        });
        next[student.id] = { ...base, components };
      });
      return next;
    });
    toast.success(t("Pasted {{n}} rows", { n: Math.min(lines.length, roster.length - row) }));
  };
  const off = (d: DraftRow) => d.isAbsent || d.exemption !== "";
  const statusOf = (d: DraftRow) => (d.exemption ? d.exemption : d.isAbsent ? "Absent" : "");

  const internalMax = schedule?.internalMaxMarks ?? 0;
  const externalMax = (schedule?.maxMarks ?? 0) - internalMax;
  const hasInternal = internalMax > 0;
  const clamp = (value: string, max: number) => Math.min(max, Math.max(0, Number(value) || 0));

  const handleSave = () => {
    if (!schedule) return;
    const rows: ExamResultEntryRow[] = roster.map((student) => {
      const draft = drafts[student.id] ?? EMPTY_DRAFT;
      if (draft.exemption) return { studentId: student.id, marksObtained: 0, isAbsent: false, exemption: draft.exemption };
      if (hasComponents) {
        const components = Object.fromEntries(comps.map((c) => [c.key, draft.isAbsent ? 0 : clampTo(draft.components[c.key], c.max)]));
        return { studentId: student.id, marksObtained: draft.isAbsent ? 0 : componentTotal(draft), components, isAbsent: draft.isAbsent };
      }
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
          <CardTitle>{t("Select exam and subject")}</CardTitle>
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
                <SelectValue placeholder={t("Select an exam")} />
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
                <SelectValue placeholder={t("Select a subject")} />
              </SelectTrigger>
              <SelectContent>
                {examSchedules.map((s) => (
                  <SelectItem key={s.id} value={s.subjectId}>{t("{{v1}} · {{date}}", { v1: subjectName(s.subjectId), date: s.date })}</SelectItem>
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
                {subjectName(schedule.subjectId)} {t("· Max marks")} {schedule.maxMarks}
                {hasComponents && ` (${comps.map((c) => `${c.label} ${c.max}`).join(" + ")})`}
                {hasInternal && t(" (internal {{internalMax}} + actual {{externalMax}})", { internalMax, externalMax })} {t("· Pass marks")} {schedule.passMarks}
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">{hasInternal
                  ? t("Enter the internal (CE) mark and the actual mark separately; the total is worked out for you. Each is clamped to its own max.")
                  : t("Enter marks for each student, or mark them absent. Marks are clamped to the max.")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {mine && (
                <Badge variant={submitted ? "success" : mine.entered >= mine.expected ? "info" : "warning"} dot>
                  {submitted ? t("Submitted") : t("{{entered}} of {{expected}} entered", { entered: mine.entered, expected: mine.expected })}
                </Badge>
              )}
              <Button variant="outline" onClick={handleSave} disabled={saveMutation.isPending || rosterLoading || resultsLoading || roster.length === 0}>
                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {t("Save draft")}
              </Button>
              {submitted ? (
                <Button variant="outline" onClick={() => reopenMutation.mutate()} disabled={reopenMutation.isPending}>{t("Reopen")}</Button>
              ) : (
                <Button onClick={() => submitMutation.mutate()} disabled={submitMutation.isPending || !mine || mine.entered < mine.expected}>{t("Submit marks")}</Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border overflow-clip">
              <Table stickyHeader>
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead>{t("Admission No.")}</TableHead>
                    <TableHead>{t("Student")}</TableHead>
                    <TableHead>{t("Section")}</TableHead>
                    {hasComponents ? (
                      <>
                        {comps.map((c) => (
                          <TableHead key={c.key}>
                            {c.label} /{c.max}
                            {!c.counts ? "*" : ""}
                          </TableHead>
                        ))}
                        <TableHead>{t("Total /{{maxMarks}}", { maxMarks: schedule.maxMarks })}</TableHead>
                      </>
                    ) : hasInternal ? (
                      <>
                        <TableHead>{t("Internal (CE) /{{internalMax}}", { internalMax })}</TableHead>
                        <TableHead>{t("Actual /{{externalMax}}", { externalMax })}</TableHead>
                        <TableHead>{t("Total /{{maxMarks}}", { maxMarks: schedule.maxMarks })}</TableHead>
                      </>
                    ) : (
                      <TableHead>{t("Marks obtained")}</TableHead>
                    )}
                    <TableHead>{t("Status")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roster.length === 0 && (
                    <TableRow hover={false}>
                      <TableCell colSpan={hasComponents ? comps.length + 5 : hasInternal ? 7 : 5} className="py-10 text-center text-muted-foreground">
                        {t("No students found in this exam's class.")}
                      </TableCell>
                    </TableRow>
                  )}
                  {roster.map((student, rowIndex) => {
                    const draft = drafts[student.id] ?? EMPTY_DRAFT;
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="text-secondary-foreground">{student.admissionNumber}</TableCell>
                        <TableCell className="font-medium">
                          {student.firstName} {student.lastName}
                        </TableCell>
                        <TableCell className="text-secondary-foreground">{student.section}</TableCell>
                        {hasComponents ? (
                          <>
                            {comps.map((c, colIndex) => (
                              <TableCell key={c.key}>
                                <Input
                                  type="number"
                                  min={0}
                                  max={c.max}
                                  step="0.5"
                                  className="w-24"
                                  data-cell={`${rowIndex}:${colIndex}`}
                                  aria-label={t("{{label}} marks for {{firstName}} {{lastName}}", { label: c.label, firstName: student.firstName, lastName: student.lastName })}
                                  aria-invalid={Number(draft.components[c.key]) > c.max ? true : undefined}
                                  disabled={off(draft)}
                                  value={draft.components[c.key] ?? ""}
                                  onKeyDown={(e) => moveFocus(e, rowIndex, colIndex)}
                                  onPaste={(e) => pasteBlock(e, rowIndex, colIndex)}
                                  onChange={(e) => setDrafts((prev) => ({ ...prev, [student.id]: { ...draft, components: { ...draft.components, [c.key]: e.target.value } } }))}
                                />
                              </TableCell>
                            ))}
                            <TableCell className="font-medium tabular-nums">{draft.exemption ? (draft.exemption === "Exempt" ? t("EX") : t("NA")) : draft.isAbsent ? t("AB") : componentTotal(draft)}</TableCell>
                          </>
                        ) : hasInternal ? (
                          <>
                            <TableCell>
                              <Input
                                type="number"
                                min={0}
                                max={internalMax}
                                className="w-24"
                                aria-label={t("Internal marks for {{firstName}} {{lastName}}", { firstName: student.firstName, lastName: student.lastName })}
                                disabled={off(draft)}
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
                                aria-label={t("Actual marks for {{firstName}} {{lastName}}", { firstName: student.firstName, lastName: student.lastName })}
                                disabled={off(draft)}
                                value={draft.externalMarks}
                                onChange={(e) => setDrafts((prev) => ({ ...prev, [student.id]: { ...draft, externalMarks: e.target.value } }))}
                              />
                            </TableCell>
                            <TableCell className="font-medium tabular-nums">
                              {draft.isAbsent ? t("AB") : clamp(draft.internalMarks, internalMax) + clamp(draft.externalMarks, externalMax)}
                            </TableCell>
                          </>
                        ) : (
                          <TableCell>
                            <Input
                              type="number"
                              min={0}
                              max={schedule.maxMarks}
                              className="w-28"
                              disabled={off(draft)}
                              value={draft.marksObtained}
                              onChange={(e) =>
                                setDrafts((prev) => ({ ...prev, [student.id]: { ...draft, marksObtained: e.target.value } }))
                              }
                            />
                          </TableCell>
                        )}
                        <TableCell>
                          <NativeSelect
                            aria-label={t("Status of {{firstName}} {{lastName}}", { firstName: student.firstName, lastName: student.lastName })}
                            value={statusOf(draft)}
                            onChange={(e) => {
                              const v = e.target.value;
                              setDrafts((prev) => ({ ...prev, [student.id]: { ...draft, isAbsent: v === "Absent", exemption: v === "Exempt" || v === "NotApplicable" ? v : "" } }));
                            }}
                          >
                            <option value="">{t("Present")}</option>
                            <option value="Absent">{t("Absent")}</option>
                            <option value="Exempt">{t("Exempt")}</option>
                            <option value="NotApplicable">{t("Not applicable")}</option>
                          </NativeSelect>
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
