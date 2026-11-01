import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Layers, Pencil, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { createCriterion, createQuestion, createTemplate, deleteCriterion, deleteQuestion, getSettings, listCriteria, listQuestions, listTemplateVersions, listTemplates, publishTemplateVersion, updateCriterion, updateQuestion, updateTemplate } from "../api";
import Checklist from "../components/Checklist";
import { EMPLOYEE_CATEGORY_LABEL, NS, QUESTION_TYPE_LABEL, REVIEWER_GROUP_LABEL, SelectField, categoryLabel, formatDateTime, groupLabel, options, useApiMutation, useAppraisalAccess } from "../shared";
import type { Criterion, CriterionAudience, CriterionValues, Question, QuestionOption, QuestionType, QuestionValues, ScoringMode, Template, TemplateValues } from "../types";

import { useTranslation } from "react-i18next";

const AUDIENCE_LABEL: Record<CriterionAudience, string> = { all: "All employees", teaching: "Teaching staff", non_teaching: "Non-teaching staff" };
const LANGS: [string, string][] = [["ml", "Malayalam"], ["hi", "Hindi"], ["ta", "Tamil"], ["ar", "Arabic"]];

export default function QuestionBankPage() {
  const { t } = useTranslation(NS);
  const access = useAppraisalAccess();
  const criteria = useQuery({ queryKey: ["appraisal", "criteria"], queryFn: listCriteria });
  const questions = useQuery({ queryKey: ["appraisal", "questions"], queryFn: () => listQuestions({ includeInactive: true }) });
  const templates = useQuery({ queryKey: ["appraisal", "templates"], queryFn: listTemplates });
  const edit = access.canManageQuestions;

  return (
    <Tabs defaultValue="questions">
      <TabsList variant="line">
        <TabsTrigger value="questions">{t("Questions")}</TabsTrigger>
        <TabsTrigger value="criteria">{t("Criteria")}</TabsTrigger>
        <TabsTrigger value="templates">{t("Templates & versions")}</TabsTrigger>
      </TabsList>
      <TabsContent value="questions">
        <QuestionsTab questions={questions} criteria={criteria.data ?? []} canEdit={edit} />
      </TabsContent>
      <TabsContent value="criteria">
        <CriteriaTab query={criteria} canEdit={edit} />
      </TabsContent>
      <TabsContent value="templates">
        <TemplatesTab query={templates} questions={questions.data ?? []} canEdit={edit} />
      </TabsContent>
    </Tabs>
  );
}

// ── Criteria ────────────────────────────────────────────────────────────────

function CriteriaTab({ query, canEdit }: { query: ReturnType<typeof useQuery<Criterion[]>>; canEdit: boolean }) {
  const { t } = useTranslation(NS);
  const [editing, setEditing] = useState<Criterion | "new" | null>(null);
  const [deleting, setDeleting] = useState<Criterion | null>(null);
  const remove = useApiMutation((c: Criterion) => deleteCriterion(c.id), { success: t("Criterion deleted"), invalidate: [["appraisal", "criteria"]], onSuccess: () => setDeleting(null) });

  const columns: ColumnDef<Criterion, unknown>[] = [
    { id: "name", header: t("Criterion"), accessorFn: (r) => r.name, cell: ({ row }) => <div><p className="text-sm font-medium">{row.original.name}</p>{row.original.description && <p className="text-xs text-muted-foreground">{row.original.description}</p>}</div> },
    { id: "audience", header: t("For"), accessorFn: (r) => r.audience, cell: ({ row }) => <span className="text-sm">{t(AUDIENCE_LABEL[row.original.audience])}</span> },
    { id: "weight", header: t("Weight"), accessorFn: (r) => r.weight, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.weight}</span> },
    { id: "q", header: t("Questions"), accessorFn: (r) => r.questionCount, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.questionCount}</span> },
    { id: "active", header: t("Status"), accessorFn: (r) => r.isActive, cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "neutral"}>{row.original.isActive ? t("Active") : t("Inactive")}</Badge> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        canEdit ? (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label={t("Edit {{name}}", { name: row.original.name })} onClick={() => setEditing(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label={t("Delete {{name}}", { name: row.original.name })} onClick={() => setDeleting(row.original)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={[...(query.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder)}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        pageSize={10}
        empty={{ title: t("No criteria yet"), description: t("Criteria group questions, e.g. Teaching quality or Professional conduct.") }}
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> {t("New criterion")}
            </Button>
          ) : undefined
        }
      />
      <CriterionDialog value={editing} count={query.data?.length ?? 0} onClose={() => setEditing(null)} />
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("Delete this criterion?")} description={t("A criterion that still has questions can't be deleted.")} confirmLabel={t("Delete")} confirmVariant="destructive" submitting={remove.isPending} onConfirm={() => { if (deleting) remove.mutate(deleting); }} />
    </>
  );
}

function CriterionDialog({ value, count, onClose }: { value: Criterion | "new" | null; count: number; onClose: () => void }) {
  const { t } = useTranslation(NS);
  const [v, setV] = useState<CriterionValues>({ name: "", description: "", audience: "all", weight: 1, displayOrder: 0, isActive: true });
  useEffect(() => {
    if (value === null) return;
    setV(value === "new" ? { name: "", description: "", audience: "all", weight: 1, displayOrder: count + 1, isActive: true } : { name: value.name, description: value.description ?? "", audience: value.audience, weight: value.weight, displayOrder: value.displayOrder, isActive: value.isActive, rowVersion: value.rowVersion });
  }, [value, count]);
  const save = useApiMutation((x: CriterionValues) => (value && value !== "new" ? updateCriterion(value.id, x) : createCriterion(x)), { success: t("Criterion saved"), invalidate: [["appraisal", "criteria"]], onSuccess: onClose });
  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{value === "new" ? t("New criterion") : t("Edit criterion")}</DialogTitle>
        </DialogHeader>
        <FormField label={t("Name")} htmlFor="cr-name" required>
          <Input id="cr-name" value={v.name} maxLength={200} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </FormField>
        <FormField label={t("Description")} htmlFor="cr-desc" optional>
          <Textarea id="cr-desc" rows={2} value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </FormField>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label={t("Applies to")} htmlFor="cr-aud">
            <SelectField id="cr-aud" value={v.audience} onChange={(x) => x && setV({ ...v, audience: x })} items={options(AUDIENCE_LABEL).map((o) => ({ ...o, label: t(o.label) }))} />
          </FormField>
          <FormField label={t("Weight")} htmlFor="cr-w">
            <Input id="cr-w" type="number" min={0} step="0.1" value={v.weight} onChange={(e) => setV({ ...v, weight: Math.max(0, Number(e.target.value) || 0) })} />
          </FormField>
          <FormField label={t("Order")} htmlFor="cr-o">
            <Input id="cr-o" type="number" min={0} value={v.displayOrder} onChange={(e) => setV({ ...v, displayOrder: Math.max(0, Number(e.target.value) || 0) })} />
          </FormField>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={v.isActive} onCheckedChange={(c) => setV({ ...v, isActive: c })} aria-label={t("Active")} /> {t("Active")}
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={save.isPending} disabled={!v.name.trim() || save.isPending} onClick={() => save.mutate({ ...v, name: v.name.trim() })}>
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Questions ───────────────────────────────────────────────────────────────

function QuestionsTab({ questions, criteria, canEdit }: { questions: ReturnType<typeof useQuery<Question[]>>; criteria: Criterion[]; canEdit: boolean }) {
  const { t } = useTranslation(NS);
  const [criterionId, setCriterionId] = useState<string | undefined>();
  const [editing, setEditing] = useState<Question | "new" | null>(null);
  const [deleting, setDeleting] = useState<Question | null>(null);
  const names = useMemo(() => Object.fromEntries(criteria.map((c) => [c.id, c.name])), [criteria]);
  const rows = (questions.data ?? []).filter((q) => !criterionId || q.criterionId === criterionId).sort((a, b) => a.displayOrder - b.displayOrder);
  const remove = useApiMutation((q: Question) => deleteQuestion(q.id), { success: t("Question deleted"), invalidate: [["appraisal", "questions"], ["appraisal", "criteria"]], onSuccess: () => setDeleting(null) });

  const columns: ColumnDef<Question, unknown>[] = [
    { id: "text", header: t("Question"), accessorFn: (r) => r.text, cell: ({ row }) => <div><p className="text-sm font-medium">{row.original.text}</p><p className="text-xs text-muted-foreground">{names[row.original.criterionId] ?? ""} · {t(QUESTION_TYPE_LABEL[row.original.type])}</p></div> },
    { id: "who", header: t("Asked of"), accessorFn: (r) => r.reviewerGroups.join(","), cell: ({ row }) => <span className="text-xs">{row.original.reviewerGroups.length ? row.original.reviewerGroups.map((g) => t(groupLabel(g))).join(", ") : t("Every reviewer group")}</span> },
    { id: "flags", header: "", enableSorting: false, cell: ({ row }) => <div className="flex flex-wrap gap-1">{row.original.confidential && <Badge variant="warning">{t("Confidential")}</Badge>}{row.original.required && <Badge variant="info">{t("Required")}</Badge>}{!row.original.scored && <Badge variant="neutral">{t("Not scored")}</Badge>}{!row.original.isActive && <Badge variant="neutral">{t("Inactive")}</Badge>}</div> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) =>
        canEdit ? (
          <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label={t("Edit question")} onClick={() => setEditing(row.original)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" aria-label={t("Delete question")} onClick={() => setDeleting(row.original)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <>
      <DataTable
        searchable
        columns={columns}
        data={rows}
        isLoading={questions.isLoading}
        isError={questions.isError}
        onRetry={() => questions.refetch()}
        pageSize={10}
        empty={{ title: t("No questions yet"), description: t("Add questions, then group them into a template.") }}
        filters={<SelectField aria-label={t("Criterion")} className="w-56" allLabel={t("All criteria")} value={criterionId} onChange={setCriterionId} items={criteria.map((c) => ({ value: c.id, label: c.name }))} />}
        actions={
          canEdit ? (
            <Button size="sm" disabled={criteria.length === 0} onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> {t("New question")}
            </Button>
          ) : undefined
        }
      />
      <QuestionDialog value={editing} criteria={criteria} count={questions.data?.length ?? 0} defaultCriterion={criterionId} onClose={() => setEditing(null)} />
      <ConfirmDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)} title={t("Delete this question?")} description={t("Published template versions keep their own copy.")} confirmLabel={t("Delete")} confirmVariant="destructive" submitting={remove.isPending} onConfirm={() => { if (deleting) remove.mutate(deleting); }} />
    </>
  );
}

const blankQuestion = (criterionId: string, order: number): QuestionValues => ({
  criterionId,
  text: "",
  description: "",
  type: "Rating",
  required: true,
  scored: true,
  weight: 1,
  allowNotApplicable: false,
  allowComment: true,
  employeeCategories: [],
  reviewerGroups: [],
  options: [],
  translations: {},
  displayOrder: order,
  isActive: true,
  confidential: false,
});

function QuestionDialog({ value, criteria, count, defaultCriterion, onClose }: { value: Question | "new" | null; criteria: Criterion[]; count: number; defaultCriterion?: string; onClose: () => void }) {
  const { t } = useTranslation(NS);
  const settings = useQuery({ queryKey: ["appraisal", "settings"], queryFn: getSettings, enabled: value !== null });
  const [v, setV] = useState<QuestionValues>(blankQuestion("", 0));
  useEffect(() => {
    if (value === null) return;
    if (value === "new") setV(blankQuestion(defaultCriterion ?? criteria[0]?.id ?? "", count + 1));
    else {
      const { id: _id, ...rest } = value;
      void _id;
      setV(rest);
    }
  }, [value, criteria, count, defaultCriterion]);

  const save = useApiMutation((x: QuestionValues) => (value && value !== "new" ? updateQuestion(value.id, x) : createQuestion(x)), { success: t("Question saved"), invalidate: [["appraisal", "questions"], ["appraisal", "criteria"]], onSuccess: onClose });
  const set = <K extends keyof QuestionValues>(k: K, x: QuestionValues[K]) => setV((s) => ({ ...s, [k]: x }));
  const isText = ["Comment", "Strengths", "ImprovementAreas", "Achievements", "NextGoals", "Suggestion"].includes(v.type);
  const groups = [...Object.keys(REVIEWER_GROUP_LABEL), ...(settings.data?.custom.reviewerGroups ?? [])];
  const categories = [...Object.keys(EMPLOYEE_CATEGORY_LABEL), ...(settings.data?.custom.employeeCategories ?? [])];
  const staffOnly = (g: string) => g !== "student" && g !== "parent";
  const confidentialConflict = v.confidential && v.reviewerGroups.some((g) => !staffOnly(g));
  const choices: QuestionOption[] = v.options;

  const valid = v.criterionId && v.text.trim() && !confidentialConflict && (v.type !== "MultipleChoice" || (choices.length >= 2 && choices.every((o) => o.label.trim())));

  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{value === "new" ? t("New question") : t("Edit question")}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField label={t("Criterion")} htmlFor="q-crit" required>
            <SelectField id="q-crit" value={v.criterionId} onChange={(x) => x && set("criterionId", x)} items={criteria.map((c) => ({ value: c.id, label: c.name }))} />
          </FormField>
          <FormField label={t("Type")} htmlFor="q-type" required>
            <SelectField id="q-type" value={v.type} onChange={(x: QuestionType | undefined) => x && set("type", x)} items={options(QUESTION_TYPE_LABEL).map((o) => ({ ...o, label: t(o.label) }))} />
          </FormField>
          <FormField label={t("Question")} htmlFor="q-text" required className="sm:col-span-2">
            <Textarea id="q-text" rows={2} value={v.text} maxLength={500} onChange={(e) => set("text", e.target.value)} />
          </FormField>
          <FormField label={t("Help text")} htmlFor="q-desc" optional className="sm:col-span-2">
            <Input id="q-desc" value={v.description ?? ""} maxLength={500} onChange={(e) => set("description", e.target.value)} />
          </FormField>
        </div>

        {v.type === "MultipleChoice" && (
          <div className="space-y-2">
            <p className="text-sm font-medium">{t("Choices")}</p>
            {choices.map((o, i) => (
              <div key={i} className="flex gap-2">
                <Input aria-label={t("Choice label")} value={o.label} maxLength={200} onChange={(e) => set("options", choices.map((c, j) => (j === i ? { ...c, label: e.target.value, value: c.value || `opt${i + 1}` } : c)))} />
                <Input aria-label={t("Score")} type="number" className="w-24" value={o.score ?? ""} placeholder={t("Score")} onChange={(e) => set("options", choices.map((c, j) => (j === i ? { ...c, score: e.target.value === "" ? null : Number(e.target.value) } : c)))} />
                <Button size="icon" variant="ghost" aria-label={t("Remove choice")} onClick={() => set("options", choices.filter((_, j) => j !== i))}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button size="sm" variant="outline" onClick={() => set("options", [...choices, { value: `opt${choices.length + 1}`, label: "", score: null }])}>
              <Plus className="h-4 w-4" /> {t("Add choice")}
            </Button>
          </div>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          <Flag label={t("Required")} checked={v.required} onChange={(c) => set("required", c)} />
          <Flag label={t("Counts towards the score")} checked={v.scored} disabled={isText} onChange={(c) => set("scored", c)} />
          <Flag label={t("Allow \"not applicable\"")} checked={v.allowNotApplicable} onChange={(c) => set("allowNotApplicable", c)} />
          <Flag label={t("Allow an optional comment")} checked={v.allowComment} onChange={(c) => set("allowComment", c)} />
          <Flag label={t("Confidential (staff reviewers only)")} checked={v.confidential} onChange={(c) => set("confidential", c)} />
          <Flag label={t("Active")} checked={v.isActive} onChange={(c) => set("isActive", c)} />
        </div>
        {confidentialConflict && <p role="alert" className="text-xs text-destructive-strong">{t("A confidential question can't be asked of students or parents. Remove those groups or turn confidential off.")}</p>}

        <FormField label={t("Asked of")} hint={t("Leave empty to ask every reviewer group.")}>
          <Checklist aria-label={t("Reviewer groups")} columns={2} items={groups.map((g) => ({ value: g, label: t(groupLabel(g)) }))} value={v.reviewerGroups} onChange={(x) => set("reviewerGroups", x)} />
        </FormField>
        <FormField label={t("About employees in")} hint={t("Leave empty for every employee category (e.g. pick Library staff for library-specific questions).")}>
          <Checklist aria-label={t("Employee categories")} columns={3} items={categories.map((c) => ({ value: c, label: t(categoryLabel(c)) }))} value={v.employeeCategories} onChange={(x) => set("employeeCategories", x)} />
        </FormField>

        <div className="grid gap-3 sm:grid-cols-3">
          <FormField label={t("Weight")} htmlFor="q-w">
            <Input id="q-w" type="number" min={0} step="0.1" value={v.weight} onChange={(e) => set("weight", Math.max(0, Number(e.target.value) || 0))} />
          </FormField>
          <FormField label={t("Order")} htmlFor="q-o">
            <Input id="q-o" type="number" min={0} value={v.displayOrder} onChange={(e) => set("displayOrder", Math.max(0, Number(e.target.value) || 0))} />
          </FormField>
        </div>

        <details className="rounded-lg border border-border px-3 py-2">
          <summary className="cursor-pointer text-sm font-medium">{t("Translations (optional)")}</summary>
          <div className="mt-2 space-y-2">
            {LANGS.map(([code, name]) => (
              <FormField key={code} label={name} htmlFor={`q-tr-${code}`} optional>
                <Input id={`q-tr-${code}`} value={v.translations[code] ?? ""} maxLength={500} onChange={(e) => set("translations", { ...v.translations, [code]: e.target.value })} />
              </FormField>
            ))}
          </div>
        </details>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={save.isPending} disabled={!valid || save.isPending} onClick={() => save.mutate({ ...v, text: v.text.trim(), translations: Object.fromEntries(Object.entries(v.translations).filter(([, x]) => x.trim())) })}>
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const Flag = ({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (c: boolean) => void; disabled?: boolean }) => (
  <label className="flex items-center gap-2 text-sm">
    <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} /> {label}
  </label>
);

// ── Templates ───────────────────────────────────────────────────────────────

function TemplatesTab({ query, questions, canEdit }: { query: ReturnType<typeof useQuery<Template[]>>; questions: Question[]; canEdit: boolean }) {
  const { t } = useTranslation(NS);
  const [editing, setEditing] = useState<Template | "new" | null>(null);
  const [versionsOf, setVersionsOf] = useState<Template | null>(null);
  const publish = useApiMutation((tpl: Template) => publishTemplateVersion(tpl.id), { success: (v) => t("Version {{n}} published", { n: v.versionNo }), invalidate: [["appraisal", "templates"], ["appraisal", "template-versions"]] });

  const columns: ColumnDef<Template, unknown>[] = [
    { id: "name", header: t("Template"), accessorFn: (r) => r.name, cell: ({ row }) => <div><p className="text-sm font-medium">{row.original.name}</p>{row.original.description && <p className="text-xs text-muted-foreground">{row.original.description}</p>}</div> },
    { id: "cats", header: t("For"), accessorFn: (r) => r.employeeCategories.join(","), cell: ({ row }) => <span className="text-xs">{row.original.employeeCategories.length ? row.original.employeeCategories.map((c) => t(categoryLabel(c))).join(", ") : t("Any category")}</span> },
    { id: "q", header: t("Questions"), accessorFn: (r) => r.questionIds.length, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.questionIds.length}</span> },
    { id: "mode", header: t("Scoring"), accessorFn: (r) => r.scoringMode, cell: ({ row }) => <Badge variant={row.original.scoringMode === "qualitative" ? "info" : "brand"}>{row.original.scoringMode === "qualitative" ? t("Qualitative") : t("Weighted score")}</Badge> },
    { id: "ver", header: t("Latest version"), accessorFn: (r) => r.latestVersion, cell: ({ row }) => <span className="text-sm">{row.original.latestVersion ? `v${row.original.latestVersion}` : t("none yet")}</span> },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setVersionsOf(row.original)}>
            <Layers className="h-4 w-4" /> {t("Versions")}
          </Button>
          {canEdit && (
            <>
              <Button size="sm" variant="outline" loading={publish.isPending} onClick={() => publish.mutate(row.original)}>
                {t("Publish version")}
              </Button>
              <Button size="icon" variant="ghost" aria-label={t("Edit {{name}}", { name: row.original.name })} onClick={() => setEditing(row.original)}>
                <Pencil className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <p className="mb-3 text-sm text-muted-foreground">{t("A cycle uses a published, frozen version of a template, so editing questions later never changes a cycle that already started.")}</p>
      <DataTable
        columns={columns}
        data={query.data ?? []}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => query.refetch()}
        pageSize={10}
        empty={{ title: t("No templates yet"), description: t("A template picks the questions for one kind of appraisal.") }}
        actions={
          canEdit ? (
            <Button size="sm" onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" /> {t("New template")}
            </Button>
          ) : undefined
        }
      />
      <TemplateDialog value={editing} questions={questions} onClose={() => setEditing(null)} />
      <VersionsDialog template={versionsOf} onClose={() => setVersionsOf(null)} />
    </>
  );
}

function TemplateDialog({ value, questions, onClose }: { value: Template | "new" | null; questions: Question[]; onClose: () => void }) {
  const { t } = useTranslation(NS);
  const settings = useQuery({ queryKey: ["appraisal", "settings"], queryFn: getSettings, enabled: value !== null });
  const [v, setV] = useState<TemplateValues>({ name: "", description: "", employeeCategories: [], questionIds: [], isActive: true, scoringMode: "numeric" });
  useEffect(() => {
    if (value === null) return;
    setV(value === "new" ? { name: "", description: "", employeeCategories: [], questionIds: [], isActive: true, scoringMode: "numeric" } : { name: value.name, description: value.description ?? "", employeeCategories: value.employeeCategories, questionIds: value.questionIds, isActive: value.isActive, scoringMode: value.scoringMode, rowVersion: value.rowVersion });
  }, [value]);
  const save = useApiMutation((x: TemplateValues) => (value && value !== "new" ? updateTemplate(value.id, x) : createTemplate(x)), { success: t("Template saved"), invalidate: [["appraisal", "templates"]], onSuccess: onClose });
  const categories = [...Object.keys(EMPLOYEE_CATEGORY_LABEL), ...(settings.data?.custom.employeeCategories ?? [])];
  return (
    <Dialog open={value !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{value === "new" ? t("New template") : t("Edit template")}</DialogTitle>
        </DialogHeader>
        <FormField label={t("Name")} htmlFor="tp-name" required>
          <Input id="tp-name" value={v.name} maxLength={200} onChange={(e) => setV({ ...v, name: e.target.value })} />
        </FormField>
        <FormField label={t("Description")} htmlFor="tp-desc" optional>
          <Textarea id="tp-desc" rows={2} value={v.description ?? ""} onChange={(e) => setV({ ...v, description: e.target.value })} />
        </FormField>
        <FormField label={t("Scoring")} htmlFor="tp-mode" hint={t("Qualitative templates collect feedback and development plans with no numeric score or ranking.")}>
          <SelectField id="tp-mode" value={v.scoringMode} onChange={(x: ScoringMode | undefined) => x && setV({ ...v, scoringMode: x })} items={[{ value: "numeric", label: t("Weighted score") }, { value: "qualitative", label: t("Qualitative") }]} />
        </FormField>
        <FormField label={t("Employee categories")} hint={t("Leave empty for any category.")}>
          <Checklist aria-label={t("Employee categories")} columns={3} items={categories.map((c) => ({ value: c, label: t(categoryLabel(c)) }))} value={v.employeeCategories} onChange={(x) => setV({ ...v, employeeCategories: x })} />
        </FormField>
        <FormField label={t("Questions in this template")}>
          <Checklist aria-label={t("Questions")} columns={1} items={questions.filter((q) => q.isActive).map((q) => ({ value: q.id, label: q.text }))} value={v.questionIds} onChange={(x) => setV({ ...v, questionIds: x })} />
        </FormField>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={v.isActive} onCheckedChange={(c) => setV({ ...v, isActive: c })} aria-label={t("Active")} /> {t("Active")}
        </label>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={save.isPending} disabled={!v.name.trim() || save.isPending} onClick={() => save.mutate({ ...v, name: v.name.trim() })}>
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function VersionsDialog({ template, onClose }: { template: Template | null; onClose: () => void }) {
  const { t } = useTranslation(NS);
  const versions = useQuery({ queryKey: ["appraisal", "template-versions", template?.id], queryFn: () => listTemplateVersions(template!.id), enabled: Boolean(template) });
  return (
    <Dialog open={template !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("Versions of {{name}}", { name: template?.name ?? "" })}</DialogTitle>
        </DialogHeader>
        {(versions.data ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">{versions.isLoading ? t("Loading…") : t("Nothing has been published yet.")}</p>
        ) : (
          <ul className="divide-y divide-border text-sm">
            {versions.data!.map((x) => (
              <li key={x.id} className="flex justify-between py-2">
                <span className="font-medium">v{x.versionNo}</span>
                <span className="text-muted-foreground">{formatDateTime(x.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
