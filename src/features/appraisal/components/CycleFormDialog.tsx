import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { listAcademicYears, listDepartments } from "@/features/academics/api";
import { createCycle, getSettings, listTemplateVersions, listTemplates, updateCycle } from "../api";
import { EMPLOYEE_CATEGORY_LABEL, NS, SelectField, categoryLabel, useApiMutation } from "../shared";
import type { CycleDetail, CycleValues } from "../types";
import Checklist from "./Checklist";

import { useTranslation } from "react-i18next";

const APPRAISAL_TYPES = ["Annual", "Half-yearly", "Quarterly", "Probation", "Promotion review", "Custom"];

const empty = (): CycleValues => ({
  name: "",
  academicYearId: null,
  startDate: "",
  endDate: "",
  evaluationPeriod: "",
  appraisalType: "Annual",
  templateVersionId: "",
  eligibleDepartmentIds: [],
  eligibleCategories: [],
  reviewOpenDate: null,
  submissionDeadline: null,
  managerDeadline: null,
  approvalDeadline: null,
  finalizationDate: null,
  allowDuplicateParticipants: false,
});

const fromDetail = (d: CycleDetail): CycleValues => ({
  name: d.summary.name,
  academicYearId: d.summary.academicYearId ?? null,
  startDate: d.summary.startDate.slice(0, 10),
  endDate: d.summary.endDate.slice(0, 10),
  evaluationPeriod: d.evaluationPeriod ?? "",
  appraisalType: d.summary.appraisalType ?? "Annual",
  templateVersionId: d.templateVersionId ?? "",
  eligibleDepartmentIds: d.eligibleDepartmentIds,
  eligibleCategories: d.eligibleCategories,
  reviewOpenDate: d.reviewOpenDate?.slice(0, 10) ?? null,
  submissionDeadline: d.summary.submissionDeadline?.slice(0, 10) ?? null,
  managerDeadline: d.managerDeadline?.slice(0, 10) ?? null,
  approvalDeadline: d.summary.approvalDeadline?.slice(0, 10) ?? null,
  finalizationDate: d.finalizationDate?.slice(0, 10) ?? null,
  allowDuplicateParticipants: d.allowDuplicateParticipants,
  config: d.config,
  rowVersion: d.summary.rowVersion,
});

/** Create or edit a draft cycle. A published cycle is frozen, so this is only offered for drafts; settings are copied in at creation. */
export default function CycleFormDialog({ open, cycle, onClose, onSaved }: { open: boolean; cycle?: CycleDetail | null; onClose: () => void; onSaved?: (c: CycleDetail) => void }) {
  const { t } = useTranslation(NS);
  const editing = Boolean(cycle);
  const [v, setV] = useState<CycleValues>(empty);
  const [templateId, setTemplateId] = useState<string | undefined>();

  const years = useQuery({ queryKey: ["appraisal", "ref", "years"], queryFn: listAcademicYears, enabled: open, staleTime: 300_000 });
  const departments = useQuery({ queryKey: ["appraisal", "ref", "departments"], queryFn: listDepartments, enabled: open, staleTime: 300_000 });
  const settings = useQuery({ queryKey: ["appraisal", "settings"], queryFn: getSettings, enabled: open });
  const templates = useQuery({ queryKey: ["appraisal", "templates"], queryFn: listTemplates, enabled: open });
  const versions = useQuery({ queryKey: ["appraisal", "template-versions", templateId], queryFn: () => listTemplateVersions(templateId!), enabled: open && Boolean(templateId) });

  useEffect(() => {
    if (!open) return;
    setV(cycle ? fromDetail(cycle) : empty());
    setTemplateId(undefined);
  }, [open, cycle]);

  // Editing: preselect the template the cycle uses (the detail carries its name), so its versions load and the current one is shown.
  useEffect(() => {
    if (!open || !cycle || templateId || !templates.data) return;
    const current = templates.data.find((x) => x.name === cycle.templateName);
    if (current) setTemplateId(current.id);
  }, [open, cycle, templateId, templates.data]);

  const save = useApiMutation((values: CycleValues) => (cycle ? updateCycle(cycle.summary.id, values) : createCycle(values)), {
    success: editing ? t("Cycle updated") : t("Cycle created"),
    invalidate: [["appraisal", "cycles"]],
    onSuccess: (c) => {
      onSaved?.(c);
      onClose();
    },
  });

  const set = <K extends keyof CycleValues>(k: K, value: CycleValues[K]) => setV((s) => ({ ...s, [k]: value }));
  const categories = [...Object.keys(EMPLOYEE_CATEGORY_LABEL), ...(settings.data?.custom.employeeCategories ?? [])];
  const valid = v.name.trim() && v.startDate && v.endDate && v.endDate >= v.startDate && v.templateVersionId;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? t("Edit appraisal cycle") : t("New appraisal cycle")}</DialogTitle>
          <DialogDescription>{t("Reviewer rules, scale and approval stages are copied from the school's configuration and frozen when you publish.")}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label={t("Cycle name")} htmlFor="cy-name" required className="sm:col-span-2">
            <Input id="cy-name" value={v.name} maxLength={200} onChange={(e) => set("name", e.target.value)} />
          </FormField>
          <FormField label={t("Academic year")} htmlFor="cy-year" optional>
            <SelectField id="cy-year" value={v.academicYearId ?? undefined} onChange={(x) => set("academicYearId", x ?? null)} allLabel={t("Not linked")} items={(years.data ?? []).map((y) => ({ value: y.id, label: y.name }))} />
          </FormField>
          <FormField label={t("Appraisal type")} htmlFor="cy-type">
            <SelectField id="cy-type" value={v.appraisalType} onChange={(x) => x && set("appraisalType", x)} items={APPRAISAL_TYPES.map((x) => ({ value: x, label: t(x) }))} />
          </FormField>
          <FormField label={t("Evaluation period starts")} htmlFor="cy-start" required>
            <Input id="cy-start" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </FormField>
          <FormField label={t("Evaluation period ends")} htmlFor="cy-end" required error={v.endDate && v.startDate && v.endDate < v.startDate ? t("The end can't be before the start") : undefined}>
            <Input id="cy-end" type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </FormField>
          <FormField label={t("Period label")} htmlFor="cy-period" optional className="sm:col-span-2">
            <Input id="cy-period" value={v.evaluationPeriod} maxLength={100} placeholder={t("e.g. April 2026 – March 2027")} onChange={(e) => set("evaluationPeriod", e.target.value)} />
          </FormField>

          <FormField label={t("Template")} htmlFor="cy-template" required hint={editing ? undefined : t("Pick a template, then the frozen version this cycle uses.")}>
            <SelectField id="cy-template" value={templateId} onChange={setTemplateId} items={(templates.data ?? []).filter((x) => x.isActive).map((x) => ({ value: x.id, label: x.name }))} placeholder={v.templateVersionId && !templateId ? t("Keep current version") : t("Select a template")} />
          </FormField>
          <FormField label={t("Template version")} htmlFor="cy-version" required>
            <SelectField
              id="cy-version"
              value={v.templateVersionId || undefined}
              onChange={(x) => x && set("templateVersionId", x)}
              disabled={!templateId && !v.templateVersionId}
              items={[
                ...(!templateId && v.templateVersionId && cycle ? [{ value: v.templateVersionId, label: `${cycle.templateName ?? ""} v${cycle.templateVersionNo ?? ""}` }] : []),
                ...(versions.data ?? []).map((x) => ({ value: x.id, label: `v${x.versionNo}` })),
              ]}
            />
            {templateId && versions.data && versions.data.length === 0 && <p className="text-xs text-warning-strong">{t("This template has no published version yet - publish one in Criteria & questions.")}</p>}
          </FormField>

          <FormField label={t("Reviews open")} htmlFor="cy-open" optional>
            <Input id="cy-open" type="date" value={v.reviewOpenDate ?? ""} onChange={(e) => set("reviewOpenDate", e.target.value || null)} />
          </FormField>
          <FormField label={t("Submission deadline")} htmlFor="cy-sub" optional>
            <Input id="cy-sub" type="date" value={v.submissionDeadline ?? ""} onChange={(e) => set("submissionDeadline", e.target.value || null)} />
          </FormField>
          <FormField label={t("Manager review deadline")} htmlFor="cy-mgr" optional>
            <Input id="cy-mgr" type="date" value={v.managerDeadline ?? ""} onChange={(e) => set("managerDeadline", e.target.value || null)} />
          </FormField>
          <FormField label={t("Approval deadline")} htmlFor="cy-appr" optional>
            <Input id="cy-appr" type="date" value={v.approvalDeadline ?? ""} onChange={(e) => set("approvalDeadline", e.target.value || null)} />
          </FormField>
          <FormField label={t("Finalization date")} htmlFor="cy-fin" optional>
            <Input id="cy-fin" type="date" value={v.finalizationDate ?? ""} onChange={(e) => set("finalizationDate", e.target.value || null)} />
          </FormField>

          <FormField label={t("Employee categories in this cycle")} className="sm:col-span-2" hint={t("Leave empty to allow every category the school has switched on.")}>
            <Checklist aria-label={t("Employee categories")} columns={3} items={categories.map((c) => ({ value: c, label: t(categoryLabel(c)) }))} value={v.eligibleCategories} onChange={(x) => set("eligibleCategories", x)} />
          </FormField>
          <FormField label={t("Departments")} className="sm:col-span-2" hint={t("Leave empty for every department.")}>
            <Checklist aria-label={t("Departments")} columns={3} items={(departments.data ?? []).map((d) => ({ value: d.id, label: d.name }))} value={v.eligibleDepartmentIds} onChange={(x) => set("eligibleDepartmentIds", x)} />
          </FormField>
          <label className="flex items-center gap-2 text-sm sm:col-span-2">
            <Switch checked={v.allowDuplicateParticipants} onCheckedChange={(c) => set("allowDuplicateParticipants", c)} aria-label={t("Allow people already in another live cycle")} />
            {t("Allow people who are already in another live cycle for this period")}
          </label>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button loading={save.isPending} disabled={!valid || save.isPending} onClick={() => save.mutate(v)}>
            {editing ? t("Save changes") : t("Create cycle")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
