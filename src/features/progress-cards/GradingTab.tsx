import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BadgeCheck, Copy, Plus, Save, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { listClasses, listSubjects } from "@/features/academics/api";
import { archiveScheme, copySystemScheme, listSchemes, listSubjectRules, saveSubjectRule, updateScheme, verifyScheme } from "./api";
import type { GradingScheme, SchemeConfig } from "./types";

function Editor({ scheme }: { scheme: GradingScheme }) {
  const { t } = useTranslation("progress-cards");
  const queryClient = useQueryClient();
  const [name, setName] = useState(scheme.name);
  const [board, setBoard] = useState(scheme.board);
  const [config, setConfig] = useState<SchemeConfig>(scheme.config);
  useEffect(() => { setName(scheme.name); setBoard(scheme.board); setConfig(scheme.config); }, [scheme]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["progress-cards"] });
  const onError = (e: Error) => toast.error(e.message);
  const save = useMutation({ mutationFn: () => updateScheme(scheme.id as string, { name, board, config }), onSuccess: () => { refresh(); toast.success(t("Saved. Confirm the rules again before using them.")); }, onError });
  const verify = useMutation({ mutationFn: () => verifyScheme(scheme.id as string), onSuccess: () => { refresh(); toast.success(t("Confirmed. Cards can now be graded with this scheme.")); }, onError });
  const remove = useMutation({ mutationFn: () => archiveScheme(scheme.id as string), onSuccess: () => { refresh(); toast.success(t("Archived")); }, onError });

  const setBand = (i: number, patch: Partial<SchemeConfig["bands"][number]>) => setConfig((c) => ({ ...c, bands: c.bands.map((b, j) => (j === i ? { ...b, ...patch } : b)) }));
  const dirty = JSON.stringify(config) !== JSON.stringify(scheme.config) || name !== scheme.name || board !== scheme.board;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          {scheme.name}
          {scheme.isVerified ? <Badge variant="success"><BadgeCheck className="me-1 h-3 w-3" />{t("Confirmed")}</Badge> : <Badge variant="warning">{t("Not confirmed")}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5"><Label>{t("Name")}</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("Board")}</Label><Input value={board} onChange={(e) => setBoard(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>{t("Assessment type")}</Label>
            <NativeSelect className="w-full" value={config.mode} onChange={(e) => setConfig({ ...config, mode: e.target.value as SchemeConfig["mode"] })}>
              <option value="Grade">{t("Grade based")}</option><option value="Marks">{t("Marks based (no grades)")}</option><option value="Percentage">{t("Percentage based")}</option>
            </NativeSelect></div>
          <div className="space-y-1.5"><Label>{t("Subject pass mark (%)")}</Label><Input type="number" min={0} max={100} value={config.passPercent} onChange={(e) => setConfig({ ...config, passPercent: Number(e.target.value) })} /></div>
          <div className="space-y-1.5"><Label>{t("Overall result rule")}</Label>
            <NativeSelect className="w-full" value={config.resultRule} onChange={(e) => setConfig({ ...config, resultRule: e.target.value as SchemeConfig["resultRule"] })}>
              <option value="AllSubjects">{t("Pass every subject")}</option><option value="Percentage">{t("Overall percentage reaches the pass mark")}</option>
            </NativeSelect></div>
          <div className="space-y-1.5"><Label>{t("Decimal places")}</Label><Input type="number" min={0} max={3} value={config.rounding.decimals} onChange={(e) => setConfig({ ...config, rounding: { ...config.rounding, decimals: Number(e.target.value) } })} /></div>
          <div className="space-y-1.5"><Label>{t("Rounding")}</Label>
            <NativeSelect className="w-full" value={config.rounding.mode} onChange={(e) => setConfig({ ...config, rounding: { ...config.rounding, mode: e.target.value as SchemeConfig["rounding"]["mode"] } })}>
              <option value="nearest">{t("Nearest")}</option><option value="up">{t("Always up")}</option><option value="down">{t("Always down")}</option>
            </NativeSelect></div>
          <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" checked={config.rankEnabled} onChange={(e) => setConfig({ ...config, rankEnabled: e.target.checked })} /> {t("Show class rank")}</label>
        </div>

        {config.mode !== "Marks" && (
          <div className="space-y-2">
            <Label>{t("Grade boundaries (percentage at or above)")}</Label>
            {config.bands.map((b, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <Input className="w-24" aria-label={t("Grade")} value={b.grade} onChange={(e) => setBand(i, { grade: e.target.value })} />
                <Input className="w-28" aria-label={t("Minimum percentage")} type="number" min={0} max={100} value={b.min} onChange={(e) => setBand(i, { min: Number(e.target.value) })} />
                <span className="text-xs text-muted-foreground">%</span>
                <Input className="w-24" aria-label={t("Grade point")} type="number" step="0.5" value={b.point} onChange={(e) => setBand(i, { point: Number(e.target.value) })} />
                <span className="text-xs text-muted-foreground">{t("points")}</span>
                <Button variant="ghost" size="icon-sm" aria-label={t("Remove band")} onClick={() => setConfig({ ...config, bands: config.bands.filter((_, j) => j !== i) })}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setConfig({ ...config, bands: [...config.bands, { grade: "", min: 0, point: 0 }] })}><Plus className="h-4 w-4" /> {t("Add band")}</Button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!dirty}><Save className="h-4 w-4" /> {t("Save changes")}</Button>
          <Button variant="outline" onClick={() => verify.mutate()} loading={verify.isPending} disabled={dirty || scheme.isVerified}><BadgeCheck className="h-4 w-4" /> {t("I have checked these against the board guideline")}</Button>
          <Button variant="destructive-outline" onClick={() => remove.mutate()}>{t("Archive")}</Button>
        </div>
        {scheme.verifiedAt && <p className="text-xs text-muted-foreground">{t("Confirmed on")} {new Date(scheme.verifiedAt).toLocaleString()}.</p>}
      </CardContent>
    </Card>
  );
}

/** Optional / additional subjects and a subject's own grading scheme. A class rule beats the school-wide one. */
function SubjectRules({ schemes }: { schemes: GradingScheme[] }) {
  const { t } = useTranslation("progress-cards");
  const queryClient = useQueryClient();
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const rules = useQuery({ queryKey: ["progress-cards", "subject-rules"], queryFn: listSubjectRules });
  const [form, setForm] = useState({ subjectId: "", classId: "", kind: "optional", schemeId: "" });

  const save = useMutation({
    mutationFn: (v: { subjectId: string; classId: string | null; isOptional: boolean; isAdditional: boolean; gradingSchemeId: string | null }) => saveSubjectRule(v),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["progress-cards", "subject-rules"] }); toast.success(t("Saved")); },
    onError: (e: Error) => toast.error(e.message),
  });
  const kindLabel = (r: { isOptional: boolean; isAdditional: boolean }) => (r.isAdditional ? t("Additional") : r.isOptional ? t("Optional") : t("Normal"));

  return (
    <Card>
      <CardHeader><CardTitle>{t("Optional and additional subjects, and subject grading")}</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{t("An optional subject counts only for students who have marks in it. An additional subject is shown and graded but left out of the total, percentage and result. A subject can use its own confirmed grading scheme.")}</p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5"><Label>{t("Subject")}</Label><NativeSelect className="w-full" value={form.subjectId} onChange={(e) => setForm({ ...form, subjectId: e.target.value })}><option value="">{t("Select")}</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</NativeSelect></div>
          <div className="space-y-1.5"><Label>{t("Class")}</Label><NativeSelect className="w-full" value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })}><option value="">{t("Every class")}</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</NativeSelect></div>
          <div className="space-y-1.5"><Label>{t("Counts as")}</Label><NativeSelect className="w-full" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}><option value="normal">{t("Normal")}</option><option value="optional">{t("Optional")}</option><option value="additional">{t("Additional")}</option></NativeSelect></div>
          <div className="space-y-1.5"><Label>{t("Grading scheme")}</Label><NativeSelect className="w-full" value={form.schemeId} onChange={(e) => setForm({ ...form, schemeId: e.target.value })}><option value="">{t("Class scheme")}</option>{schemes.filter((s) => s.isVerified).map((s) => <option key={s.id} value={s.id ?? ""}>{s.name}</option>)}</NativeSelect></div>
          <div className="flex items-end"><Button disabled={!form.subjectId} loading={save.isPending} onClick={() => save.mutate({ subjectId: form.subjectId, classId: form.classId || null, isOptional: form.kind === "optional", isAdditional: form.kind === "additional", gradingSchemeId: form.schemeId || null })}>{t("Save rule")}</Button></div>
        </div>
        {(rules.data ?? []).length > 0 && (
          <ul className="space-y-1 text-sm">
            {(rules.data ?? []).map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border px-3 py-1.5">
                <span>{r.subjectName} · {r.classId ? classes.find((c) => c.id === r.classId)?.name : t("Every class")} · {kindLabel(r)}{r.gradingSchemeId ? ` · ${schemes.find((s) => s.id === r.gradingSchemeId)?.name ?? ""}` : ""}</span>
                <Button variant="ghost" size="icon-sm" aria-label={t("Remove")} onClick={() => save.mutate({ subjectId: r.subjectId, classId: r.classId, isOptional: false, isAdditional: false, gradingSchemeId: null })}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export default function GradingTab() {
  const { t } = useTranslation("progress-cards");
  const queryClient = useQueryClient();
  const schemes = useQuery({ queryKey: ["progress-cards", "schemes"], queryFn: listSchemes });
  const copy = useMutation({
    mutationFn: (key: string) => copySystemScheme(key),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["progress-cards"] }); toast.success(t("Copied. Review the boundaries, then confirm them.")); },
    onError: (e: Error) => toast.error(e.message),
  });
  if (schemes.isLoading) return <LoadingState />;
  if (schemes.error) return <ErrorState />;
  const system = (schemes.data ?? []).filter((s) => s.type === "System");
  const school = (schemes.data ?? []).filter((s) => s.type === "School");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>{t("Start from a board pattern")}</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {t("These are starting points, checked only against published guides, not the board's own circular. Board rules change by year and class, so a card is never graded from them directly: copy one, check it against the circular your school follows, edit it, and confirm it.")}
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {system.map((s) => (
              <div key={s.systemKey} className="flex items-start justify-between gap-2 rounded-lg border border-border p-3">
                <div className="min-w-0"><div className="font-medium">{s.name}</div><div className="text-xs text-muted-foreground">{s.note}</div></div>
                <Button size="sm" variant="outline" onClick={() => copy.mutate(s.systemKey as string)}><Copy className="h-4 w-4" /> {t("Use")}</Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      {school.length === 0 && <p className="text-sm text-muted-foreground">{t("Your school has no grading scheme yet. Copy one above to begin.")}</p>}
      {school.map((s) => <Editor key={s.id} scheme={s} />)}
      {school.length > 0 && <SubjectRules schemes={school} />}
    </div>
  );
}
