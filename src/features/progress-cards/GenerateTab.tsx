import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ChevronLeft, ChevronRight, CircleAlert, Download, FileCheck2, Plus, Printer, Search, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { EmptyState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { listClasses } from "@/features/academics/api";
import { listExams } from "@/features/examinations/api";
import { downloadPreviewPdf, generateCards, listSchemes, listTemplates } from "./api";
import { CardRenderer } from "./CardRenderer";
import { printCards } from "./printCards";
import { useProgressCardAccess } from "./access";
import type { GenerateResult } from "./types";

export default function GenerateTab() {
  const { t } = useTranslation("progress-cards");
  const queryClient = useQueryClient();
  const access = useProgressCardAccess();
  const { data: exams = [] } = useQuery({ queryKey: ["examinations", "exams"], queryFn: listExams });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: templates = [] } = useQuery({ queryKey: ["progress-cards", "templates"], queryFn: listTemplates });
  const { data: schemes = [] } = useQuery({ queryKey: ["progress-cards", "schemes"], queryFn: listSchemes });

  const [classId, setClassId] = useState("");
  const [examId, setExamId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [schemeId, setSchemeId] = useState("");
  const [weights, setWeights] = useState<{ examId: string; weight: string }[]>([]);
  const [result, setResult] = useState<GenerateResult | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [index, setIndex] = useState(0);

  const classExams = useMemo(() => exams.filter((e) => !classId || e.classId === classId), [exams, classId]);
  const mainExam = exams.find((e) => e.id === examId);
  const sameClassExams = exams.filter((e) => mainExam && e.classId === mainExam.classId);
  const schoolTemplates = templates.filter((t) => t.type === "School" && t.status === "Active");
  const schoolSchemes = schemes.filter((s) => s.type === "School" && s.status === "Active");

  const components = () => (weights.length === 0 ? undefined : weights.map((w) => ({ examId: w.examId, weight: Number(w.weight) || 0 })));
  const base = (previewOnly: boolean, studentIds: string[] = []) => ({ examId, templateId: templateId || null, gradingSchemeId: schemeId || null, studentIds, components: components(), previewOnly });

  const run = useMutation({
    mutationFn: (previewOnly: boolean) => generateCards(base(previewOnly, previewOnly ? [] : [...picked])),
    onSuccess: (r, previewOnly) => {
      setResult(r);
      if (previewOnly) {
        setPicked(new Set(r.cards.map((c) => c.data.studentId)));
        setIndex(0);
      } else {
        queryClient.invalidateQueries({ queryKey: ["progress-cards", "issues"] });
        toast.success(r.saved ? t("{{count}} cards saved as drafts. Approve and publish them from the Cards and publishing tab.", { count: r.cards.length }) : t("Nothing was saved. Fix the errors first."));
      }
    },
    onError: (e: Error) => {
      setResult(null);
      toast.error(e.message);
    },
  });
  const sample = useMutation({ mutationFn: () => downloadPreviewPdf(base(true, [...picked])), onError: (e: Error) => toast.error(e.message) });

  const errors = result?.issues.filter((i) => i.severity === "Error") ?? [];
  const warnings = result?.issues.filter((i) => i.severity === "Warning") ?? [];
  const card = result?.cards[index]?.data;
  const sumWeights = weights.reduce((a, w) => a + (Number(w.weight) || 0), 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{t("Choose what to generate")}</CardTitle></CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5"><Label>{t("Class")}</Label>
            <NativeSelect className="w-full" value={classId} onChange={(e) => { setClassId(e.target.value); setExamId(""); setWeights([]); setResult(null); }}>
              <option value="">{t("All classes")}</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </NativeSelect></div>
          <div className="space-y-1.5"><Label>{t("Examination")}</Label>
            <NativeSelect className="w-full" value={examId} onChange={(e) => { setExamId(e.target.value); setWeights([]); setResult(null); }}>
              <option value="">{t("Select an exam")}</option>{classExams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </NativeSelect></div>
          <div className="space-y-1.5"><Label>{t("Template")}</Label>
            <NativeSelect className="w-full" value={templateId} onChange={(e) => { setTemplateId(e.target.value); setResult(null); }}>
              <option value="">{t("Use the class assignment")}</option>{schoolTemplates.map((x) => <option key={x.id} value={x.id ?? ""}>{x.name}</option>)}
            </NativeSelect></div>
          <div className="space-y-1.5"><Label>{t("Grading scheme")}</Label>
            <NativeSelect className="w-full" value={schemeId} onChange={(e) => { setSchemeId(e.target.value); setResult(null); }}>
              <option value="">{t("Use the class assignment")}</option>{schoolSchemes.map((s) => <option key={s.id} value={s.id ?? ""}>{s.name}{s.isVerified ? "" : ` (${t("not confirmed")})`}</option>)}
            </NativeSelect></div>

          {examId && (
            <div className="sm:col-span-2 lg:col-span-4 space-y-2 rounded-lg border border-border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{t("Weighted exams")}</span>
                <span className="text-xs text-muted-foreground">{t("Combine several exams into one card, for example Term 1 at 30 and the annual exam at 70. Leave empty to use the exam above alone.")}</span>
              </div>
              {weights.map((w, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <div className="w-72 max-w-full shrink-0"><NativeSelect className="w-full" value={w.examId} aria-label={t("Exam")} onChange={(e) => setWeights(weights.map((x, j) => (j === i ? { ...x, examId: e.target.value } : x)))}>
                    {sameClassExams.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}</NativeSelect></div>
                  <Input className="w-24" type="number" min={1} aria-label={t("Weight")} value={w.weight} onChange={(e) => setWeights(weights.map((x, j) => (j === i ? { ...x, weight: e.target.value } : x)))} />
                  <Button variant="ghost" size="icon-sm" aria-label={t("Remove")} onClick={() => setWeights(weights.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setWeights([...weights, { examId: weights.length === 0 ? examId : (sameClassExams.find((e) => !weights.some((w) => w.examId === e.id))?.id ?? examId), weight: weights.length === 0 ? "30" : "70" }])}><Plus className="h-4 w-4" /> {t("Add exam")}</Button>
                {weights.length > 0 && <span className="text-xs text-muted-foreground">{t("Total weight")}: {sumWeights}. {t("The main exam must be one of them.")}</span>}
              </div>
            </div>
          )}

          <div className="sm:col-span-2 lg:col-span-4 flex flex-wrap gap-2">
            <Button onClick={() => run.mutate(true)} disabled={!examId} loading={run.isPending && run.variables === true}><Search className="h-4 w-4" /> {t("Check and preview")}</Button>
            <p className="self-center text-xs text-muted-foreground">{t("Marks, attendance and remarks are read from the school's existing records. Nothing is saved until you generate.")}</p>
          </div>
        </CardContent>
      </Card>

      {!result && <EmptyState icon={FileCheck2} title={t("No preview yet")} description={t("Choose an exam and run the check to see missing marks, then preview each card.")} />}

      {result && (errors.length > 0 || warnings.length > 0) && (
        <Card>
          <CardHeader><CardTitle>{t("Checks before generating")}</CardTitle></CardHeader>
          <CardContent className="space-y-1.5 text-sm">
            {errors.map((i, n) => <div key={`e${n}`} className="flex gap-2 text-destructive-strong"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />{i.studentName ? `${i.studentName}: ` : ""}{i.message}</div>)}
            {warnings.map((i, n) => <div key={`w${n}`} className="flex gap-2 text-warning-text"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{i.studentName ? `${i.studentName}: ` : ""}{i.message}</div>)}
            {errors.length > 0 && <p className="pt-1 text-muted-foreground">{t("Cards cannot be saved until the errors are fixed (enter the missing marks, or mark the exam Completed).")}</p>}
          </CardContent>
        </Card>
      )}

      {result && result.cards.length > 0 && (
        <div className="grid gap-4 xl:grid-cols-[360px_minmax(0,1fr)]">
          <Card>
            <CardHeader><CardTitle>{t("{{count}} students", { count: result.cards.length })} · {result.templateName} v{result.templateVersion}</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => run.mutate(false)} disabled={errors.length > 0 || picked.size === 0 || !access.canGenerate} loading={run.isPending && run.variables === false}>
                  <FileCheck2 className="h-4 w-4" /> {t("Generate {{count}} as drafts", { count: picked.size })}
                </Button>
                <Button size="sm" variant="outline" onClick={() => sample.mutate()} disabled={picked.size === 0} loading={sample.isPending}><Download className="h-4 w-4" /> {t("Sample PDF")}</Button>
                <Button size="sm" variant="outline" onClick={() => !printCards(result.config, result.cards.filter((c) => picked.has(c.data.studentId)).map((c) => c.data), t("Progress cards")) && toast.error(t("Allow pop-ups to print."))} disabled={picked.size === 0}>
                  <Printer className="h-4 w-4" /> {t("Print")}
                </Button>
              </div>
              <Table containerClassName="max-h-[420px] overflow-auto rounded-lg border border-border">
                <TableHeader>
                  <TableRow hover={false}>
                    <TableHead className="w-8"><input type="checkbox" aria-label={t("Select all")} checked={picked.size === result.cards.length} onChange={(e) => setPicked(e.target.checked ? new Set(result.cards.map((c) => c.data.studentId)) : new Set())} /></TableHead>
                    <TableHead>{t("Student")}</TableHead><TableHead className="text-end">%</TableHead><TableHead>{t("Result")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.cards.map((c, i) => (
                    <TableRow key={c.data.studentId} onClick={() => setIndex(i)} className={i === index ? "bg-primary/5" : "cursor-pointer"}>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" aria-label={c.data.studentName} checked={picked.has(c.data.studentId)}
                          onChange={(e) => setPicked((s) => { const n = new Set(s); if (e.target.checked) n.add(c.data.studentId); else n.delete(c.data.studentId); return n; })} />
                      </TableCell>
                      <TableCell>{c.data.studentName}{c.status && <Badge variant="neutral" className="ms-2">{t(c.status)}</Badge>}</TableCell>
                      <TableCell className="text-end tabular-nums">{c.data.percentage}</TableCell>
                      <TableCell><Badge variant={c.data.result === "Pass" ? "success" : "danger"}>{t(c.data.result)}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon-sm" aria-label={t("Previous student")} disabled={index === 0} onClick={() => setIndex(index - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              <span className="text-sm text-muted-foreground">{t("{{n}} of {{total}}", { n: index + 1, total: result.cards.length })}</span>
              <Button variant="outline" size="icon-sm" aria-label={t("Next student")} disabled={index >= result.cards.length - 1} onClick={() => setIndex(index + 1)}><ChevronRight className="h-4 w-4" /></Button>
              <span className="ms-2 text-xs text-muted-foreground">{t("Graded with")}: {result.schemeName}</span>
            </div>
            <div className="overflow-auto rounded-xl border border-border bg-muted/40 p-4" style={{ maxHeight: "75vh" }}>
              {card && <div style={{ transform: "scale(0.85)", transformOrigin: "top left", width: "fit-content" }}><CardRenderer config={result.config} data={card} /></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
