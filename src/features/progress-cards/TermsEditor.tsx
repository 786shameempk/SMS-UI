import { Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery } from "@tanstack/react-query";
import { listAssessmentStructures } from "@/features/examinations/api";
import { termsOf, type TermDef } from "./termLayout";

type Props = { props: Record<string, unknown>; disabled: boolean; onChange: (patch: Record<string, unknown>) => void };

const check = (label: string, on: boolean, disabled: boolean, set: (v: boolean) => void) => (
  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={on} disabled={disabled} onChange={(e) => set(e.target.checked)} /> {label}</label>
);

/** Add, rename and remove terms and the columns inside each term (for example PT, NBS, SEA, Term exam). */
export function TermsEditor({ props, disabled, onChange }: Props) {
  const { t } = useTranslation("progress-cards");
  const terms = termsOf(props);
  // Labels the school already uses in its assessment structures, offered as suggestions for a column's component.
  const { data: structures = [] } = useQuery({ queryKey: ["examinations", "assessment-structures"], queryFn: () => listAssessmentStructures(), staleTime: 60_000 });
  const labels = [...new Set(structures.flatMap((x) => x.components.map((c) => c.label)))];
  const save = (next: TermDef[]) =>
    onChange({ terms: next.map((x) => ({ title: x.title, totalMax: x.columns.reduce((a, c) => a + (c.max || 0), 0), columns: x.columns })) });
  const patchTerm = (i: number, patch: Partial<TermDef>) => save(terms.map((x, k) => (k === i ? { ...x, ...patch } : x)));
  const addTerm = () => {
    const n = terms.length + 1;
    const last = terms[terms.length - 1];
    save([...terms, { title: `Term-${n}`, totalMax: 0, columns: (last?.columns ?? [{ label: "Exam", exam: "", max: 100, component: "" }]).map((c) => ({ ...c, exam: "" })) }]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label>{t("Terms")}</Label>
        {!disabled && <Button type="button" size="sm" variant="outline" onClick={addTerm}><Plus className="mr-1 h-3.5 w-3.5" />{t("Add term")}</Button>}
      </div>
      {terms.map((term, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border p-2">
          <div className="flex items-center gap-2">
            <Input aria-label={t("Term name")} value={term.title} disabled={disabled} onChange={(e) => patchTerm(i, { title: e.target.value })} />
            <span className="whitespace-nowrap text-xs text-muted-foreground">{t("Total")} {term.columns.reduce((a, c) => a + (c.max || 0), 0)}</span>
            {!disabled && <Button type="button" size="icon" variant="ghost" aria-label={t("Remove term")} onClick={() => save(terms.filter((_, k) => k !== i))}><Trash2 className="h-4 w-4" /></Button>}
          </div>
          <div className="grid grid-cols-[1fr_1.2fr_1fr_4rem_auto] gap-1 text-xs text-muted-foreground"><span>{t("Column")}</span><span>{t("Exam name contains")}</span><span>{t("Component")}</span><span>{t("Max")}</span><span /></div>
          {term.columns.map((c, j) => {
            const setCol = (patch: Partial<typeof c>) => patchTerm(i, { columns: term.columns.map((x, k) => (k === j ? { ...x, ...patch } : x)) });
            return (
              <div key={j} className="grid grid-cols-[1fr_1.2fr_1fr_4rem_auto] items-center gap-1">
                <Input aria-label={t("Column")} value={c.label} disabled={disabled} onChange={(e) => setCol({ label: e.target.value })} />
                <Input aria-label={t("Exam name contains")} value={c.exam} disabled={disabled} onChange={(e) => setCol({ exam: e.target.value })} />
                <Input aria-label={t("Component")} list="assessment-labels" placeholder={t("Exam total")} value={c.component} disabled={disabled} onChange={(e) => setCol({ component: e.target.value })} />
                <Input aria-label={t("Max")} type="number" min={0} value={c.max} disabled={disabled} onChange={(e) => setCol({ max: Math.max(0, Number(e.target.value) || 0) })} />
                {!disabled && <Button type="button" size="icon" variant="ghost" aria-label={t("Remove column")} onClick={() => patchTerm(i, { columns: term.columns.filter((_, k) => k !== j) })}><Trash2 className="h-3.5 w-3.5" /></Button>}
              </div>
            );
          })}
          {!disabled && <Button type="button" size="sm" variant="ghost" onClick={() => patchTerm(i, { columns: [...term.columns, { label: "", exam: "", max: 0, component: "" }] })}><Plus className="mr-1 h-3.5 w-3.5" />{t("Add column")}</Button>}
        </div>
      ))}
      <datalist id="assessment-labels">{labels.map((l) => <option key={l} value={l} />)}</datalist>
      <p className="text-xs text-muted-foreground">{t("Leave Component empty to show the exam total, or type a component such as PT or Half Yearly to show just that part. The term total always uses the whole exam.")}</p>
      <p className="text-xs text-muted-foreground">{t("Marks are read from the weighted exams chosen when generating. A column picks the exam whose name contains the text, for example Term 1 Exam.")}</p>
      {check(t("Show term total column"), props.showTotal !== false, disabled, (v) => onChange({ showTotal: v }))}
      {check(t("Show term grade column"), props.showGrade !== false, disabled, (v) => onChange({ showGrade: v }))}
      {check(t("Show Total Marks and Max.Marks rows"), props.showTotalRow !== false, disabled, (v) => onChange({ showTotalRow: v }))}
    </div>
  );
}

const SERIES: [string, string][] = [["avg", "Class Avg. %"], ["top", "Class Top %"], ["student", "Student %"]];

/** Which terms get a chart and which bars (class average, class top, student) it shows. */
export function ChartEditor({ props, termTitles, disabled, onChange }: Props & { termTitles: string[] }) {
  const { t } = useTranslation("progress-cards");
  const picked = (k: string) => (Array.isArray(props[k]) ? (props[k] as string[]) : []);
  const toggle = (k: string, all: string[], v: string, on: boolean) => {
    const cur = picked(k).length === 0 ? all : picked(k);
    const next = on ? all.filter((x) => x === v || cur.includes(x)) : cur.filter((x) => x !== v);
    onChange({ [k]: next.length === all.length ? [] : next });
  };
  const isOn = (k: string, v: string) => picked(k).length === 0 || picked(k).includes(v);
  return (
    <div className="space-y-2">
      <Label>{t("Charts for")}</Label>
      {termTitles.length === 0 && <p className="text-xs text-muted-foreground">{t("Add a term-wise marks table first.")}</p>}
      {termTitles.map((x) => <div key={x}>{check(x, isOn("terms", x), disabled, (v) => toggle("terms", termTitles, x, v))}</div>)}
      <Label>{t("Bars")}</Label>
      {SERIES.map(([k, label]) => <div key={k}>{check(t(label), isOn("series", k), disabled, (v) => toggle("series", SERIES.map((s) => s[0]), k, v))}</div>)}
    </div>
  );
}
