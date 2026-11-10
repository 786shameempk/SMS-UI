import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listExams } from "@/features/examinations/api";
import { getCoScholastic, saveCoScholastic, type CoEntry } from "./api";

const key = (studentId: string, kind: string, area: string) => `${studentId}|${kind}|${area}`;

/** Co-scholastic grades and per-subject remarks, entered by the class teacher (their own class) or a leader (any class). */
export default function CoScholasticTab() {
  const { t } = useTranslation("progress-cards");
  const queryClient = useQueryClient();
  const { data: exams = [] } = useQuery({ queryKey: ["examinations", "exams"], queryFn: listExams });
  const [examId, setExamId] = useState("");
  const [mode, setMode] = useState<"Area" | "Subject">("Area");
  const [subjectId, setSubjectId] = useState("");
  const [extraArea, setExtraArea] = useState("");
  const [extraAreas, setExtraAreas] = useState<string[]>([]);
  const [values, setValues] = useState<Record<string, { grade: string; remark: string }>>({});

  const sheet = useQuery({ queryKey: ["progress-cards", "coscholastic", examId], queryFn: () => getCoScholastic(examId), enabled: Boolean(examId) });
  useEffect(() => {
    if (!sheet.data) return;
    const v: Record<string, { grade: string; remark: string }> = {};
    for (const e of sheet.data.entries) v[key(e.studentId, e.kind, e.area)] = { grade: e.grade ?? "", remark: e.remark ?? "" };
    setValues(v);
    setSubjectId(sheet.data.subjects[0]?.id ?? "");
    setExtraAreas([]);
  }, [sheet.data]);

  const areas = useMemo(() => [...(sheet.data?.areas ?? []), ...extraAreas.filter((a) => !(sheet.data?.areas ?? []).includes(a))], [sheet.data, extraAreas]);

  const save = useMutation({
    mutationFn: () => {
      const entries: CoEntry[] = [];
      for (const [k, v] of Object.entries(values)) {
        const [studentId, kind, area] = k.split("|");
        if (kind === "Area" && !areas.includes(area)) continue;
        entries.push({ studentId, kind: kind as CoEntry["kind"], area, grade: v.grade.trim() || null, remark: v.remark.trim() || null });
      }
      return saveCoScholastic(examId, entries);
    },
    onSuccess: (r) => {
      toast.success(t("{{count}} changes saved. Regenerate cards to include them.", { count: r.changed }));
      queryClient.invalidateQueries({ queryKey: ["progress-cards", "coscholastic", examId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const set = (studentId: string, kind: string, area: string, patch: Partial<{ grade: string; remark: string }>) =>
    setValues((v) => ({ ...v, [key(studentId, kind, area)]: { ...(v[key(studentId, kind, area)] ?? { grade: "", remark: "" }), ...patch } }));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{t("Co-scholastic grades and subject remarks")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-72 max-w-full space-y-1.5"><Label>{t("Examination")}</Label>
              <NativeSelect className="w-full" value={examId} onChange={(e) => setExamId(e.target.value)}><option value="">{t("Select an exam")}</option>{exams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</NativeSelect></div>
            <div className="w-56 max-w-full space-y-1.5"><Label>{t("Enter")}</Label>
              <NativeSelect className="w-full" value={mode} onChange={(e) => setMode(e.target.value as "Area" | "Subject")}><option value="Area">{t("Co-scholastic grades")}</option><option value="Subject">{t("Remarks on a subject")}</option></NativeSelect></div>
            {mode === "Subject" && sheet.data && (
              <div className="w-56 max-w-full space-y-1.5"><Label>{t("Subject")}</Label>
                <NativeSelect className="w-full" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{sheet.data.subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</NativeSelect></div>
            )}
            {mode === "Area" && sheet.data && (
              <div className="flex items-end gap-2">
                <div className="w-48 space-y-1.5"><Label>{t("Add an area")}</Label><Input value={extraArea} onChange={(e) => setExtraArea(e.target.value)} /></div>
                <Button variant="outline" size="sm" disabled={!extraArea.trim()} onClick={() => { setExtraAreas([...extraAreas, extraArea.trim()]); setExtraArea(""); }}><Plus className="h-4 w-4" /> {t("Add")}</Button>
              </div>
            )}
            <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!sheet.data}><Save className="h-4 w-4" /> {t("Save")}</Button>
          </div>
          <p className="text-xs text-muted-foreground">{t("Areas come from the co-scholastic section of the template assigned to the class. Cards already generated change only when you regenerate them.")}</p>

          {!examId ? <EmptyState title={t("Select an exam")} /> : sheet.isLoading ? <LoadingState /> : sheet.data && sheet.data.students.length === 0 ? (
            <EmptyState title={t("No students to show")} description={t("You can enter grades for the class you are class teacher of.")} />
          ) : sheet.data && (
            <Table containerClassName="max-h-[60vh] overflow-auto rounded-lg border border-border">
              <TableHeader>
                <TableRow hover={false}>
                  <TableHead>{t("Student")}</TableHead>
                  {mode === "Area" ? areas.map((a) => <TableHead key={a}>{a}</TableHead>) : <TableHead>{t("Remark")}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheet.data.students.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="whitespace-nowrap">{s.name} <span className="text-xs text-muted-foreground">{s.section}{s.rollNumber ? ` · ${s.rollNumber}` : ""}</span></TableCell>
                    {mode === "Area"
                      ? areas.map((a) => (
                        <TableCell key={a}><Input className="w-20" maxLength={20} aria-label={`${s.name} ${a}`} value={values[key(s.id, "Area", a)]?.grade ?? ""} onChange={(e) => set(s.id, "Area", a, { grade: e.target.value })} /></TableCell>
                      ))
                      : <TableCell><Input maxLength={500} aria-label={s.name} value={values[key(s.id, "Subject", subjectId)]?.remark ?? ""} onChange={(e) => set(s.id, "Subject", subjectId, { remark: e.target.value })} /></TableCell>}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
