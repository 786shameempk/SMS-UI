import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getSettings, listTemplates, updateSettings } from "../api";
import { EMPLOYEE_CATEGORY_LABEL, NS, REVIEWER_GROUP_LABEL, STAGE_LABEL, SelectField, categoryLabel, groupLabel, useApiMutation } from "../shared";
import type { ApprovalStage, CategoryRule, ReviewerRule, ScaleLevel, Settings } from "../types";

import { useTranslation } from "react-i18next";

const ALL_CATEGORIES = "*";
const FREQUENCIES = ["annual", "half_yearly", "quarterly", "monthly", "on_demand"];
const FREQUENCY_LABEL: Record<string, string> = { annual: "Every year", half_yearly: "Twice a year", quarterly: "Every quarter", monthly: "Every month", on_demand: "On demand" };

const newRule = (category: string, group: string): ReviewerRule => ({
  category,
  group,
  enabled: false,
  mandatory: false,
  minReviews: 0,
  maxReviews: 0,
  weight: 0,
  anonymous: group === "student" || group === "parent" || group.startsWith("peer_"),
  commentsRequired: false,
  deadlineOffsetDays: 0,
  canViewPrevious: false,
  canViewResults: false,
});

/** The school's appraisal rules: who takes part, who may review whom, the scale, anonymity, thresholds and the approval steps. */
export default function ConfigurationPage() {
  const { t } = useTranslation(NS);
  const query = useQuery({ queryKey: ["appraisal", "settings"], queryFn: getSettings });
  const templates = useQuery({ queryKey: ["appraisal", "templates"], queryFn: listTemplates });
  const [form, setForm] = useState<Settings | null>(null);
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);

  useEffect(() => {
    if (query.data) setForm(structuredClone(query.data));
  }, [query.data]);

  const save = useApiMutation((s: Settings) => updateSettings(s), {
    success: t("Configuration saved"),
    invalidate: [["appraisal", "settings"]],
  });

  if (query.isLoading || !form) return query.isError ? <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} /> : <Skeleton className="h-64 w-full" />;

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));
  const customCategories = form.custom.employeeCategories ?? [];
  const customGroups = form.custom.reviewerGroups ?? [];
  const allCategories = [...Object.keys(EMPLOYEE_CATEGORY_LABEL), ...customCategories];
  const allGroups = [...Object.keys(REVIEWER_GROUP_LABEL), ...customGroups];

  const ruleFor = (c: string): CategoryRule => form.categoryRules.find((r) => r.category === c) ?? { category: c, included: false, required: false, frequency: "annual", selfAssessment: false };
  const setCategoryRule = (c: string, patch: Partial<CategoryRule>) => {
    const next = { ...ruleFor(c), ...patch };
    set("categoryRules", [...form.categoryRules.filter((r) => r.category !== c), next]);
  };
  const reviewerRule = (c: string, g: string) => form.reviewerRules.find((r) => r.category === c && r.group === g) ?? newRule(c, g);
  const setReviewerRule = (c: string, g: string, patch: Partial<ReviewerRule>) => {
    const next = { ...reviewerRule(c, g), ...patch };
    set("reviewerRules", [...form.reviewerRules.filter((r) => !(r.category === c && r.group === g)), next]);
  };

  const enabledWeight = (c: string) => form.reviewerRules.filter((r) => r.category === c && r.enabled).reduce((n, r) => n + r.weight, 0);
  const moveStage = (i: number, d: -1 | 1) => {
    const stages = [...form.stages];
    const j = i + d;
    if (j < 0 || j >= stages.length) return;
    [stages[i], stages[j]] = [stages[j], stages[i]];
    set("stages", stages);
  };
  const setScale = (i: number, patch: Partial<ScaleLevel>) => set("scale", form.scale.map((s, x) => (x === i ? { ...s, ...patch } : s)));

  const scaleValid = form.scale.length >= 2 && form.scale.every((s) => s.label.trim());

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button loading={save.isPending} disabled={!scaleValid || save.isPending} onClick={() => save.mutate(form)}>
          <Save className="h-4 w-4" /> {t("Save configuration")}
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">{t("These settings are copied into each new cycle and frozen when the cycle is published. Changing them later does not affect cycles already published.")}</p>

      <Tabs defaultValue="participants">
        <TabsList variant="line">
          <TabsTrigger value="participants">{t("Who is appraised")}</TabsTrigger>
          <TabsTrigger value="reviewers">{t("Who reviews")}</TabsTrigger>
          <TabsTrigger value="scale">{t("Scale & scoring")}</TabsTrigger>
          <TabsTrigger value="privacy">{t("Feedback & privacy")}</TabsTrigger>
          <TabsTrigger value="workflow">{t("Approval workflow")}</TabsTrigger>
          <TabsTrigger value="notify">{t("Notifications & retention")}</TabsTrigger>
        </TabsList>

        <TabsContent value="participants">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Employee categories in appraisals")}</CardTitle>
              <CardDescription>{t("A category being switched on does not add anyone by itself. You still select the people for each cycle.")}</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="py-2 pe-3 font-medium">{t("Category")}</th>
                    <th className="py-2 pe-3 font-medium">{t("Included")}</th>
                    <th className="py-2 pe-3 font-medium">{t("Required")}</th>
                    <th className="py-2 pe-3 font-medium">{t("Self-assessment")}</th>
                    <th className="py-2 pe-3 font-medium">{t("Frequency")}</th>
                    <th className="py-2 font-medium">{t("Template")}</th>
                  </tr>
                </thead>
                <tbody>
                  {allCategories.map((c) => {
                    const r = ruleFor(c);
                    return (
                      <tr key={c} className="border-b last:border-0">
                        <td className="py-2 pe-3 font-medium">{t(categoryLabel(c))}</td>
                        <td className="py-2 pe-3">
                          <Switch checked={r.included} onCheckedChange={(v) => setCategoryRule(c, { included: v })} aria-label={`${categoryLabel(c)}: ${t("Included")}`} />
                        </td>
                        <td className="py-2 pe-3">
                          <Checkbox checked={r.required} disabled={!r.included} onCheckedChange={(v) => setCategoryRule(c, { required: v === true })} aria-label={`${categoryLabel(c)}: ${t("Required")}`} />
                        </td>
                        <td className="py-2 pe-3">
                          <Checkbox checked={r.selfAssessment} disabled={!r.included} onCheckedChange={(v) => setCategoryRule(c, { selfAssessment: v === true })} aria-label={`${categoryLabel(c)}: ${t("Self-assessment")}`} />
                        </td>
                        <td className="py-2 pe-3">
                          <SelectField aria-label={`${categoryLabel(c)}: ${t("Frequency")}`} className="w-40" disabled={!r.included} value={r.frequency} onChange={(v) => v && setCategoryRule(c, { frequency: v })} items={FREQUENCIES.map((f) => ({ value: f, label: t(FREQUENCY_LABEL[f]) }))} />
                        </td>
                        <td className="py-2">
                          <SelectField aria-label={`${categoryLabel(c)}: ${t("Template")}`} className="w-48" disabled={!r.included} allLabel={t("Any template")} value={r.templateId ?? undefined} onChange={(v) => setCategoryRule(c, { templateId: v ?? null })} items={(templates.data ?? []).map((x) => ({ value: x.id, label: x.name }))} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <CustomList
                label={t("School-defined employee categories")}
                items={customCategories}
                onChange={(v) => set("custom", { ...form.custom, employeeCategories: v })}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reviewers">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Reviewer rules")}</CardTitle>
              <CardDescription>{t("Choose which groups may review each kind of employee. \"All categories\" applies when a category has no rule of its own.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <SelectField aria-label={t("Employee category")} className="w-64" value={category} onChange={(v) => v && setCategory(v)} items={[{ value: ALL_CATEGORIES, label: t("All categories") }, ...allCategories.map((c) => ({ value: c, label: t(categoryLabel(c)) }))]} />
                <span className="text-xs text-muted-foreground">{t("Enabled weights add up to {{n}}% (they are re-based when some groups have no responses).", { n: enabledWeight(category) })}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[56rem] text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="py-2 pe-3 font-medium">{t("Reviewer group")}</th>
                      <th className="py-2 pe-3 font-medium">{t("On")}</th>
                      <th className="py-2 pe-3 font-medium">{t("Required")}</th>
                      <th className="py-2 pe-3 font-medium">{t("Min")}</th>
                      <th className="py-2 pe-3 font-medium">{t("Max")}</th>
                      <th className="py-2 pe-3 font-medium">{t("Weight %")}</th>
                      <th className="py-2 pe-3 font-medium">{t("Anonymous")}</th>
                      <th className="py-2 pe-3 font-medium">{t("Comments required")}</th>
                      <th className="py-2 pe-3 font-medium">{t("Days to answer")}</th>
                      <th className="py-2 font-medium">{t("Sees earlier")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allGroups.map((g) => {
                      const r = reviewerRule(category, g);
                      const off = !r.enabled;
                      const label = (what: string) => `${groupLabel(g)}: ${what}`;
                      return (
                        <tr key={g} className="border-b last:border-0">
                          <td className="py-2 pe-3 font-medium">{t(groupLabel(g))}</td>
                          <td className="py-2 pe-3">
                            <Switch checked={r.enabled} onCheckedChange={(v) => setReviewerRule(category, g, { enabled: v })} aria-label={label(t("On"))} />
                          </td>
                          <td className="py-2 pe-3">
                            <Checkbox checked={r.mandatory} disabled={off} onCheckedChange={(v) => setReviewerRule(category, g, { mandatory: v === true })} aria-label={label(t("Required"))} />
                          </td>
                          <td className="py-2 pe-3">
                            <NumberBox label={label(t("Min"))} value={r.minReviews} disabled={off} onChange={(n) => setReviewerRule(category, g, { minReviews: n })} />
                          </td>
                          <td className="py-2 pe-3">
                            <NumberBox label={label(t("Max"))} value={r.maxReviews} disabled={off} onChange={(n) => setReviewerRule(category, g, { maxReviews: n })} />
                          </td>
                          <td className="py-2 pe-3">
                            <NumberBox label={label(t("Weight %"))} value={r.weight} max={100} disabled={off} onChange={(n) => setReviewerRule(category, g, { weight: n })} />
                          </td>
                          <td className="py-2 pe-3">
                            <Checkbox checked={r.anonymous} disabled={off || g === "self"} onCheckedChange={(v) => setReviewerRule(category, g, { anonymous: v === true })} aria-label={label(t("Anonymous"))} />
                          </td>
                          <td className="py-2 pe-3">
                            <Checkbox checked={r.commentsRequired} disabled={off} onCheckedChange={(v) => setReviewerRule(category, g, { commentsRequired: v === true })} aria-label={label(t("Comments required"))} />
                          </td>
                          <td className="py-2 pe-3">
                            <NumberBox label={label(t("Days to answer"))} value={r.deadlineOffsetDays} disabled={off} onChange={(n) => setReviewerRule(category, g, { deadlineOffsetDays: n })} />
                          </td>
                          <td className="py-2">
                            <Checkbox checked={r.canViewPrevious} disabled={off || r.anonymous} onCheckedChange={(v) => setReviewerRule(category, g, { canViewPrevious: v === true })} aria-label={label(t("Sees earlier"))} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground">{t("Max 0 means no limit. Weights only matter in numeric scoring. A required group that doesn't reach its minimum keeps the appraisal incomplete instead of producing a misleading score.")}</p>
              <CustomList label={t("School-defined reviewer groups (assigned by hand)")} items={customGroups} onChange={(v) => set("custom", { ...form.custom, reviewerGroups: v })} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scale">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Rating scale")}</CardTitle>
              <CardDescription>{t("Labels and descriptions reviewers see. Values must stay in order.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.scale.map((s, i) => (
                <div key={i} className="grid items-end gap-2 sm:grid-cols-[4rem_1fr_2fr_auto]">
                  <FormField label={i === 0 ? t("Value") : undefined}>
                    <Input aria-label={t("Value")} type="number" value={s.value} onChange={(e) => setScale(i, { value: Number(e.target.value) || 0 })} />
                  </FormField>
                  <FormField label={i === 0 ? t("Label") : undefined}>
                    <Input aria-label={t("Label")} value={s.label} maxLength={60} onChange={(e) => setScale(i, { label: e.target.value })} />
                  </FormField>
                  <FormField label={i === 0 ? t("Description") : undefined}>
                    <Input aria-label={t("Description")} value={s.description ?? ""} maxLength={200} onChange={(e) => setScale(i, { description: e.target.value })} />
                  </FormField>
                  <Button size="icon" variant="ghost" aria-label={t("Remove level")} disabled={form.scale.length <= 2} onClick={() => set("scale", form.scale.filter((_, x) => x !== i))}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button size="sm" variant="outline" onClick={() => set("scale", [...form.scale, { value: (form.scale.at(-1)?.value ?? 0) + 1, label: "" }])}>
                <Plus className="h-4 w-4" /> {t("Add level")}
              </Button>
              {!scaleValid && <p role="alert" className="text-xs text-destructive-strong">{t("A scale needs at least two levels, each with a label.")}</p>}
              <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
                <FormField label={t("Score decimals")} htmlFor="cfg-round" hint={t("How scores are rounded when shown.")}>
                  <Input id="cfg-round" type="number" min={0} max={3} className="w-24" value={form.roundingDecimals} onChange={(e) => set("roundingDecimals", Math.max(0, Math.min(3, Number(e.target.value) || 0)))} />
                </FormField>
              </div>
              <p className="text-xs text-muted-foreground">{t("Numeric or qualitative scoring is chosen on each template and can be overridden per cycle.")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="privacy">
          <Card>
            <CardContent className="space-y-5 p-4">
              <FormField label={t("Minimum anonymous responses")} htmlFor="cfg-min" hint={t("An anonymous group's score and comments stay hidden until it has at least this many responses, so nobody can be singled out.")}>
                <Input id="cfg-min" type="number" min={1} max={50} className="w-24" value={form.minAnonymousResponses} onChange={(e) => set("minAnonymousResponses", Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
              </FormField>
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label={t("Student feedback is collected")}>
                  <SelectField value={form.studentFeedbackScope} onChange={(v) => v && set("studentFeedbackScope", v)} items={[{ value: "per_teacher", label: t("Once per teacher") }, { value: "per_subject", label: t("Once per subject") }]} />
                </FormField>
                <FormField label={t("Parent feedback is collected")}>
                  <SelectField value={form.parentFeedbackScope} onChange={(v) => v && set("parentFeedbackScope", v)} items={[{ value: "per_teacher", label: t("Once per teacher") }, { value: "per_child", label: t("Once per child") }]} />
                </FormField>
              </div>
              <Toggle label={t("More than one guardian may give feedback")} checked={form.allowMultipleGuardians} onChange={(v) => set("allowMultipleGuardians", v)} />
              <Toggle label={t("Reviewers may edit a submitted review when it is reopened")} checked={form.allowResubmission} onChange={(v) => set("allowResubmission", v)} />
              <Toggle label={t("Employees can see their released result")} checked={form.employeeSeesResults} onChange={(v) => set("employeeSeesResults", v)} />
              <Toggle label={t("Employees can also read the written feedback")} checked={form.employeeSeesComments} disabled={!form.employeeSeesResults} onChange={(v) => set("employeeSeesComments", v)} />
              <p className="text-xs text-muted-foreground">{t("Students and parents only ever see the feedback form assigned to them - never scores, comments or other reviewers. System administrators can still reach the underlying records, so anonymity is a display rule, not an absolute promise.")}</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("Approval steps")}</CardTitle>
              <CardDescription>{t("Switch steps on or off and set their order. A disabled step is skipped.")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {form.stages.map((s: ApprovalStage, i) => (
                <div key={s.key} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <label className="flex items-center gap-3 text-sm font-medium">
                    <Switch checked={s.enabled} onCheckedChange={(v) => set("stages", form.stages.map((x, j) => (j === i ? { ...x, enabled: v } : x)))} aria-label={t(STAGE_LABEL[s.key] ?? s.key)} />
                    {i + 1}. {t(STAGE_LABEL[s.key] ?? s.key)}
                  </label>
                  <div className="flex">
                    <Button size="icon" variant="ghost" aria-label={t("Move up")} disabled={i === 0} onClick={() => moveStage(i, -1)}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" aria-label={t("Move down")} disabled={i === form.stages.length - 1} onClick={() => moveStage(i, 1)}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <Toggle label={t("An employee may approve their own appraisal (exception)")} checked={form.allowSelfApproval} onChange={(v) => set("allowSelfApproval", v)} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notify">
          <Card>
            <CardContent className="space-y-4 p-4">
              <Toggle label={t("Tell reviewers when a review is assigned")} checked={form.notifyAssignments} onChange={(v) => set("notifyAssignments", v)} />
              <Toggle label={t("Remind reviewers about deadlines")} checked={form.notifyDeadlines} onChange={(v) => set("notifyDeadlines", v)} />
              <Toggle label={t("Tell approvers when something needs approval")} checked={form.notifyApprovals} onChange={(v) => set("notifyApprovals", v)} />
              <Toggle label={t("Tell employees when their appraisal is finalized")} checked={form.notifyFinalized} onChange={(v) => set("notifyFinalized", v)} />
              <p className="text-xs text-muted-foreground">{t("Notifications are generic. They never contain scores, comments or reviewer names.")}</p>
              <FormField label={t("Keep appraisal records for (years)")} htmlFor="cfg-ret" hint={t("Finalized appraisals are never deleted automatically.")}>
                <Input id="cfg-ret" type="number" min={1} max={50} className="w-24" value={form.retentionYears} onChange={(e) => set("retentionYears", Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
              </FormField>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Toggle({ label, checked, onChange, disabled }: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} aria-label={label} />
      {label}
    </label>
  );
}

function NumberBox({ label, value, onChange, disabled, max = 999 }: { label: string; value: number; onChange: (n: number) => void; disabled?: boolean; max?: number }) {
  return <Input aria-label={label} type="number" min={0} max={max} disabled={disabled} className="w-20" value={value} onChange={(e) => onChange(Math.max(0, Math.min(max, Math.round(Number(e.target.value) || 0))))} />;
}

function CustomList({ label, items, onChange }: { label: string; items: string[]; onChange: (items: string[]) => void }) {
  const { t } = useTranslation(NS);
  const [draft, setDraft] = useState("");
  const add = () => {
    const name = draft.trim();
    if (!name || items.includes(name)) return;
    onChange([...items, name]);
    setDraft("");
  };
  return (
    <div className="mt-4 space-y-2 border-t border-border pt-4">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((x) => (
          <span key={x} className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-xs">
            {x}
            <button type="button" aria-label={t("Remove {{name}}", { name: x })} className="text-muted-foreground hover:text-foreground" onClick={() => onChange(items.filter((i) => i !== x))}>
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input aria-label={label} className="max-w-xs" value={draft} maxLength={60} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())} />
        <Button size="sm" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus className="h-4 w-4" /> {t("Add")}
        </Button>
      </div>
    </div>
  );
}
