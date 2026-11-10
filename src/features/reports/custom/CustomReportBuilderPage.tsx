import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { ErrorState, PageSkeleton } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { listAcademicYears } from "@/features/academics/api";
import { useTenantBranding } from "@/features/tenant/TenantProvider";
import { cn } from "@/utils/cn";
import { createCustomReport, getCustomReport, getDatasets, updateCustomReport } from "./api";
import { WIZARD_STEPS, emptyDefinition, normaliseDefinition, sendableDefinition, stepProblem, type WizardStep } from "./definition";
import ColumnsStep from "./steps/ColumnsStep";
import FiltersStep from "./steps/FiltersStep";
import GroupSortStep from "./steps/GroupSortStep";
import PreviewStep from "./steps/PreviewStep";
import SettingsStep from "./steps/SettingsStep";
import SourceStep from "./steps/SourceStep";
import type { CustomReportDefinition } from "./types";

const STEP_LABELS: Record<WizardStep, string> = {
  source: "Data source",
  columns: "Columns",
  filters: "Filters",
  group: "Group & sort",
  settings: "Settings",
  preview: "Preview & generate",
};

/** The step-by-step report builder: create a report at /custom-reports/new, or change a saved one at /custom-reports/:id/edit. */
export default function CustomReportBuilderPage() {
  const { t } = useTranslation("reports");
  const { id } = useParams<{ id: string }>();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const branding = useTenantBranding();

  const catalogQuery = useQuery({ queryKey: ["custom-datasets"], queryFn: getDatasets, staleTime: 60_000 });
  const savedQuery = useQuery({ queryKey: ["custom-report", id], queryFn: () => getCustomReport(id!), enabled: Boolean(id) });
  const years = useQuery({ queryKey: ["academic-years"], queryFn: listAcademicYears, staleTime: 5 * 60_000 });

  const [step, setStep] = useState<WizardStep>("source");
  const [datasetKey, setDatasetKey] = useState<string | null>(params.get("source"));
  const [definition, setDefinition] = useState<CustomReportDefinition>(emptyDefinition);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [savedId, setSavedId] = useState<string | null>(id ?? null);
  const [canEdit, setCanEdit] = useState(true);
  const [saveOpen, setSaveOpen] = useState<"new" | null>(null);
  const [dirty, setDirty] = useState(false);
  const loadedFor = useRef<string | null>(null);

  // Open a saved report once: it keeps its data source and goes straight to the columns.
  useEffect(() => {
    const detail = savedQuery.data;
    if (!detail || loadedFor.current === detail.summary.id) return;
    loadedFor.current = detail.summary.id;
    setDatasetKey(detail.summary.datasetKey);
    setDefinition(normaliseDefinition(detail.definition));
    setName(detail.summary.name);
    setDescription(detail.summary.description ?? "");
    setSavedId(detail.summary.id);
    setCanEdit(detail.summary.canEdit);
    setStep("columns");
  }, [savedQuery.data]);

  // A source chosen on the landing page skips the first step.
  useEffect(() => {
    if (!id && params.get("source") && catalogQuery.data?.datasets.some((d) => d.key === params.get("source"))) setStep((s) => (s === "source" ? "columns" : s));
  }, [id, params, catalogQuery.data]);

  const dataset = catalogQuery.data?.datasets.find((d) => d.key === datasetKey) ?? null;
  const fields = useMemo(() => dataset?.fields ?? [], [dataset]);
  const ctx = { datasetKey, definition, fields };
  const index = WIZARD_STEPS.indexOf(step);
  const yearName = years.data?.find((y) => y.id === definition.settings.academicYearId)?.name ?? null;

  const change = (patch: Partial<CustomReportDefinition>) => { setDefinition((d) => ({ ...d, ...patch })); setDirty(true); };
  const changeSettings = (patch: Partial<CustomReportDefinition["settings"]>) => { setDefinition((d) => ({ ...d, settings: { ...d.settings, ...patch } })); setDirty(true); };

  function chooseDataset(key: string) {
    if (key === datasetKey) return;
    if (definition.columns.length > 0 && !window.confirm(t("Changing the data source clears the columns, filters and sorting you have set. Continue?"))) return;
    setDatasetKey(key);
    setDefinition((d) => ({ ...emptyDefinition(), settings: { ...d.settings, academicYearId: null, dateFrom: null, dateTo: null } }));
    setDirty(true);
    setStep("columns");
  }

  /** The first step before `target` that is not complete; the user can always go back, but not skip a broken step forward. */
  function blocker(target: WizardStep): { step: WizardStep; message: string } | null {
    for (const s of WIZARD_STEPS.slice(0, WIZARD_STEPS.indexOf(target))) {
      const message = stepProblem(s, ctx);
      if (message) return { step: s, message };
    }
    return null;
  }

  function go(target: WizardStep) {
    const block = blocker(target);
    if (block) {
      toast.error(t(block.message));
      setStep(block.step);
      return;
    }
    setStep(target);
    window.scrollTo({ top: 0 });
  }

  const save = useMutation({
    mutationFn: async ({ asNew, saveName, saveDescription }: { asNew: boolean; saveName: string; saveDescription: string }) => {
      const body = { name: saveName, description: saveDescription || null, datasetKey: datasetKey!, definition: sendableDefinition(definition, fields) };
      return asNew || !savedId ? createCustomReport(body) : updateCustomReport(savedId, body);
    },
    onSuccess: (detail, vars) => {
      toast.success(vars.asNew || !savedId ? t("Report saved") : t("Report updated"));
      setSavedId(detail.summary.id);
      setCanEdit(detail.summary.canEdit);
      setName(detail.summary.name);
      setDescription(detail.summary.description ?? "");
      setDirty(false);
      setSaveOpen(null);
      void queryClient.invalidateQueries({ queryKey: ["custom-reports"] });
      queryClient.setQueryData(["custom-report", detail.summary.id], detail);
      if (id !== detail.summary.id) navigate(`/custom-reports/${detail.summary.id}/edit`, { replace: true });
    },
    onError: (err: unknown) => toast.error(err instanceof Error ? err.message : t("The report could not be saved.")),
  });

  function saveClicked() {
    const problem = stepProblem("columns", ctx) ?? stepProblem("filters", ctx);
    if (problem) { toast.error(t(problem)); return; }
    if (savedId && canEdit) save.mutate({ asNew: false, saveName: name, saveDescription: description });
    else setSaveOpen("new");
  }

  function reset() {
    if (!window.confirm(t("Reset the configuration? Your columns, filters, grouping and settings will be cleared."))) return;
    setDefinition(emptyDefinition());
    setDirty(true);
    setStep(datasetKey ? "columns" : "source");
  }

  if (catalogQuery.isLoading || (id && savedQuery.isLoading)) return <PageContainer><PageSkeleton /></PageContainer>;
  if (catalogQuery.isError || (id && savedQuery.isError)) {
    const err = (savedQuery.error ?? catalogQuery.error) as Error | null;
    return <PageContainer><ErrorState title={t("The report builder could not be opened")} description={err?.message} onRetry={() => { void catalogQuery.refetch(); void savedQuery.refetch(); }} /></PageContainer>;
  }
  const catalog = catalogQuery.data!;
  if (id && savedQuery.data && !catalog.datasets.some((d) => d.key === savedQuery.data!.summary.datasetKey)) {
    return <PageContainer><ErrorState title={t("This report's data source is not available to you")} description={t("Your school's plan or your role no longer includes the module this report reads.")} /></PageContainer>;
  }

  const nextProblem = stepProblem(step, ctx);

  return (
    <PageContainer>
      <Link to="/custom-reports" className="inline-flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" aria-hidden="true" />{t("All reports")}</Link>
      <PageHeader
        title={savedId ? (name || t("Edit report")) : t("Create new report")}
        description={dataset ? `${dataset.title}${dirty ? ` · ${t("unsaved changes")}` : ""}` : t("Build a report from your school's own data, step by step.")}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={reset} disabled={!datasetKey}><RotateCcw className="h-4 w-4" />{t("Reset")}</Button>
            {savedId && canEdit && (
              <Button type="button" variant="outline" size="sm" onClick={() => setSaveOpen("new")} disabled={!datasetKey}>{t("Save as new")}</Button>
            )}
            <Button type="button" size="sm" onClick={saveClicked} disabled={!datasetKey || save.isPending} loading={save.isPending}>
              <Save className="h-4 w-4" />{savedId && !canEdit ? t("Save a copy") : t("Save")}
            </Button>
          </div>
        }
      />

      {savedId && !canEdit && (
        <p role="status" className="rounded-lg border border-info/30 bg-info-soft p-3 text-sm">{t("This report was shared with you to run only. You can try changes here and save them as your own copy.")}</p>
      )}

      <nav aria-label={t("Report builder steps")} className="-mx-1 overflow-x-auto px-1">
        <ol className="flex min-w-max gap-1.5">
          {WIZARD_STEPS.map((s, i) => {
            const done = i < index && stepProblem(s, ctx) === null;
            const current = s === step;
            return (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => go(s)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    current ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:bg-secondary",
                    !current && done && "border-success/40",
                  )}
                >
                  <span className={cn("flex h-5 w-5 items-center justify-center rounded-full text-xs", current ? "bg-primary-foreground/20" : "bg-secondary")}>
                    {done && !current ? <Check className="h-3 w-3" aria-hidden="true" /> : i + 1}
                  </span>
                  {t(STEP_LABELS[s])}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <div className="rounded-2xl border bg-card p-4 sm:p-6">
        {step === "source" && <SourceStep datasets={catalog.datasets} selected={datasetKey} onSelect={chooseDataset} locked={Boolean(savedId)} />}
        {step === "columns" && dataset && <ColumnsStep datasetKey={dataset.key} service={dataset.service} fields={fields} definition={definition} onChange={(columns) => change({ columns })} />}
        {step === "filters" && dataset && <FiltersStep datasetKey={dataset.key} service={dataset.service} fields={fields} definition={definition} onChange={(filters) => change({ filters })} />}
        {step === "group" && dataset && (
          <GroupSortStep datasetKey={dataset.key} service={dataset.service} fields={fields} definition={definition} onChange={change} onShowGroupCounts={(on) => changeSettings({ showGroupCounts: on })} />
        )}
        {step === "settings" && dataset && <SettingsStep dataset={dataset} settings={definition.settings} onChange={changeSettings} hasLogo={Boolean(branding?.logoUrl)} />}
        {step === "preview" && dataset && <PreviewStep dataset={dataset} catalog={catalog} definition={definition} title={name} yearName={yearName} onEdit={go} />}
        {step !== "source" && !dataset && <p className="text-sm text-muted-foreground">{t("Choose a data source first.")}</p>}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button type="button" variant="outline" disabled={index === 0} onClick={() => go(WIZARD_STEPS[index - 1])}><ArrowLeft className="h-4 w-4" />{t("Back")}</Button>
        <div className="flex items-center gap-3">
          {nextProblem && step !== "preview" && <span role="status" className="hidden text-sm text-muted-foreground sm:inline">{t(nextProblem)}</span>}
          {step !== "preview" && <Button type="button" onClick={() => go(WIZARD_STEPS[index + 1])} disabled={Boolean(nextProblem)}>{t("Next")}<ArrowRight className="h-4 w-4" /></Button>}
        </div>
      </div>

      <SaveDialog
        open={saveOpen !== null}
        initialName={saveOpen === "new" ? (savedId ? `${name} (copy)`.slice(0, 150) : name || definition.settings.title || "") : name}
        initialDescription={description}
        saving={save.isPending}
        onClose={() => setSaveOpen(null)}
        onSave={(saveName, saveDescription) => save.mutate({ asNew: true, saveName, saveDescription })}
      />
    </PageContainer>
  );
}

function SaveDialog({ open, initialName, initialDescription, saving, onClose, onSave }: { open: boolean; initialName: string; initialDescription: string; saving: boolean; onClose: () => void; onSave: (name: string, description: string) => void }) {
  const { t } = useTranslation("reports");
  const [name, setName] = useState(initialName);
  const [description, setDescription] = useState(initialDescription);
  useEffect(() => { if (open) { setName(initialName); setDescription(initialDescription); } }, [open, initialName, initialDescription]);
  const invalid = name.trim().length === 0;
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <form onSubmit={(e) => { e.preventDefault(); if (!invalid) onSave(name.trim(), description.trim()); }} className="space-y-4">
          <DialogHeader>
            <DialogTitle>{t("Save report")}</DialogTitle>
            <DialogDescription>{t("Saved reports keep their data source, columns, filters, grouping, sorting and layout. Only you can see it until you share it.")}</DialogDescription>
          </DialogHeader>
          <FormField label={t("Report name")} htmlFor="cr-save-name" required>
            <Input id="cr-save-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} autoFocus />
          </FormField>
          <FormField label={t("Description")} htmlFor="cr-save-desc" optional>
            <Textarea id="cr-save-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={1000} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>{t("Cancel")}</Button>
            <Button type="submit" disabled={invalid} loading={saving}>{t("Save report")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
