import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { BookCopy, Copy, FileStack, Pencil, Plus, Send, Trash2, Archive } from "lucide-react";
import { z } from "zod";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/ui/row-actions";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ToggleChip } from "@/components/ui/toggle-chip";
import {
  archiveSyllabus,
  createCurriculum,
  createSyllabus,
  deleteCurriculum,
  deleteSyllabus,
  getSyllabus,
  listCurricula,
  listSyllabi,
  newSyllabusVersion,
  publishSyllabus,
  saveSyllabusAsTemplate,
  syllabusFromTemplate,
  updateCurriculum,
  updateSyllabus,
} from "../api";
import { BOARD_LABEL, SYLLABUS_STATUS, SelectField, StatusBadge, formatDate, guardedClose, options, useApiMutation, usePortionAccess, useReferenceData } from "../shared";
import type { Curriculum, CurriculumBoard, SyllabusStatus, SyllabusSummary } from "../types";

import { useTranslation } from "react-i18next";
export default function SyllabusSetupPage() {
  const { t } = useTranslation("lesson-portions");
  const access = usePortionAccess();
  return (
    <Tabs defaultValue="syllabi">
      <TabsList variant="line">
        <TabsTrigger value="syllabi">{t("Syllabus plans")}</TabsTrigger>
        <TabsTrigger value="templates">{t("Templates")}</TabsTrigger>
        <TabsTrigger value="curricula">{t("Curricula")}</TabsTrigger>
      </TabsList>
      <TabsContent value="syllabi">
        <SyllabiTab canManage={access.canManage} />
      </TabsContent>
      <TabsContent value="templates">
        <TemplatesTab canManage={access.canManage} />
      </TabsContent>
      <TabsContent value="curricula">
        <CurriculaTab canManage={access.canManage} />
      </TabsContent>
    </Tabs>
  );
}

// ── Syllabus plans ──────────────────────────────────────────────────────────

function SyllabiTab({ canManage }: { canManage: boolean }) {
  const { t } = useTranslation("lesson-portions");
  const data = useReferenceData();
  const curricula = useQuery({ queryKey: ["portions", "curricula"], queryFn: listCurricula });
  const [filters, setFilters] = useState<{ academicYearId?: string; classId?: string; subjectId?: string; curriculumId?: string; status?: SyllabusStatus }>({});
  const [form, setForm] = useState<{ open: boolean; editing: SyllabusSummary | null }>({ open: false, editing: null });
  const [confirm, setConfirm] = useState<{ kind: "delete" | "archive" | "publish"; item: SyllabusSummary } | null>(null);
  const [template, setTemplate] = useState<SyllabusSummary | null>(null);
  const year = filters.academicYearId ?? data.currentYearId;

  const list = useQuery({
    queryKey: ["portions", "syllabi", { ...filters, academicYearId: year }],
    queryFn: () => listSyllabi({ ...filters, academicYearId: year, pageSize: 200 }),
    enabled: Boolean(year) || !data.isLoading,
    placeholderData: (p) => p,
  });

  const publish = useApiMutation(publishSyllabus, { success: "Syllabus published", onSuccess: () => setConfirm(null) });
  const archive = useApiMutation(archiveSyllabus, { success: "Syllabus archived", onSuccess: () => setConfirm(null) });
  const remove = useApiMutation(deleteSyllabus, { success: "Syllabus deleted", onSuccess: () => setConfirm(null) });
  const version = useApiMutation(newSyllabusVersion, { success: (s) => `Version ${s.version} created as a draft` });

  const columns: ColumnDef<SyllabusSummary, unknown>[] = [
    {
      id: "title",
      header: t("Syllabus"),
      accessorFn: (r) => `${r.title} ${r.className} ${r.subjectName}`,
      cell: ({ row }) => (
        <div className="min-w-0">
          <Link to={`/lesson-portions/syllabus/${row.original.id}`} className="text-sm font-medium text-foreground hover:underline">
            {row.original.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {row.original.className} · {row.original.subjectName} · {row.original.curriculumName}
          </p>
        </div>
      ),
    },
    { id: "version", header: t("Version"), accessorFn: (r) => r.version, cell: ({ row }) => <span className="text-sm">{t("v{{version}}", { version: row.original.version })}</span> },
    { id: "status", header: t("Status"), accessorFn: (r) => r.status, cell: ({ row }) => <StatusBadge map={SYLLABUS_STATUS} value={row.original.status} /> },
    { id: "chapters", header: t("Chapters"), accessorFn: (r) => r.chapterCount, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.chapterCount}</span> },
    { id: "topics", header: t("Topics"), accessorFn: (r) => r.topicCount, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.topicCount}</span> },
    { id: "periods", header: t("Periods"), accessorFn: (r) => r.plannedPeriods, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.plannedPeriods}</span> },
    { id: "deadline", header: t("Complete by"), accessorFn: (r) => r.completionDeadline ?? "", cell: ({ row }) => <span className="text-sm">{formatDate(row.original.completionDeadline)}</span> },
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            enableSorting: false,
            cell: ({ row }) => {
              const s = row.original;
              return (
                <RowActions label={t("Actions for {{title}}", { title: s.title })}>
                  <DropdownMenuItem asChild>
                    <Link to={`/lesson-portions/syllabus/${s.id}`}>{t("Open chapters and topics")}</Link>
                  </DropdownMenuItem>
                  {s.status !== "Archived" && (
                    <DropdownMenuItem onClick={() => setForm({ open: true, editing: s })}>
                      <Pencil /> {t("Edit details")}
                    </DropdownMenuItem>
                  )}
                  {s.status === "Draft" && (
                    <DropdownMenuItem onClick={() => setConfirm({ kind: "publish", item: s })}>
                      <Send /> {t("Publish")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => version.mutate(s.id)}>
                    <Copy /> {t("New version")}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTemplate(s)}>
                    <FileStack /> {t("Save as template")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {s.status !== "Archived" && (
                    <DropdownMenuItem onClick={() => setConfirm({ kind: "archive", item: s })}>
                      <Archive /> {t("Archive")}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem variant="destructive" onClick={() => setConfirm({ kind: "delete", item: s })}>
                    <Trash2 /> {t("Delete")}
                  </DropdownMenuItem>
                </RowActions>
              );
            },
          } satisfies ColumnDef<SyllabusSummary, unknown>,
        ]
      : []),
  ];

  const yearItems = data.years.map((y) => ({ value: y.id, label: y.name }));
  return (
    <div className="space-y-4">
      <DataTable
        searchable
        searchPlaceholder="Search syllabus…"
        columns={columns}
        data={list.data?.items ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        exportFileName="syllabus-plans"
        pageSize={10}
        empty={{ icon: BookCopy, title: t("No syllabus plans for these filters"), description: canManage ? "Create a syllabus for a class and subject, or start from a template." : "Your school hasn't set up a syllabus for these filters yet." }}
        filters={
          <>
            <SelectField aria-label={t("Academic year")} value={year} onChange={(v) => setFilters({ ...filters, academicYearId: v })} items={yearItems} className="w-36" />
            <SelectField aria-label={t("Class")} value={filters.classId} onChange={(v) => setFilters({ ...filters, classId: v })} allLabel="All classes" items={data.classes.map((c) => ({ value: c.id, label: c.name }))} className="w-36" />
            <SelectField aria-label={t("Subject")} value={filters.subjectId} onChange={(v) => setFilters({ ...filters, subjectId: v })} allLabel="All subjects" items={data.subjects.map((c) => ({ value: c.id, label: c.name }))} className="w-40" />
            <SelectField aria-label={t("Curriculum")} value={filters.curriculumId} onChange={(v) => setFilters({ ...filters, curriculumId: v })} allLabel="All curricula" items={(curricula.data ?? []).map((c) => ({ value: c.id, label: c.name }))} className="w-40" />
            <SelectField aria-label={t("Status")} value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} allLabel="Any status" items={options({ Draft: "Draft", Published: "Published", Archived: "Archived" })} className="w-36" />
          </>
        }
        actions={
          canManage && (
            <Button onClick={() => setForm({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> {t("New syllabus")}
            </Button>
          )
        }
      />

      <SyllabusFormDialog open={form.open} editing={form.editing} onOpenChange={(open) => setForm({ open, editing: open ? form.editing : null })} curricula={curricula.data ?? []} data={data} defaultYear={year} />
      <SaveTemplateDialog source={template} onClose={() => setTemplate(null)} />

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === "delete" ? t("Delete this syllabus?") : confirm?.kind === "archive" ? t("Archive this syllabus?") : t("Publish this syllabus?")}
        description={
          confirm?.kind === "delete"
            ? t("Its chapters and topics are removed. A syllabus with lesson plans or teaching records can't be deleted; archive it instead.")
            : confirm?.kind === "archive"
              ? t("Teachers can no longer record progress against it, and it stops counting in new reports. Existing records are kept.")
              : t("Teachers can record progress against it, and it appears in dashboards. An earlier published version of the same syllabus is archived.")
        }
        confirmLabel={confirm?.kind === "delete" ? t("Delete") : confirm?.kind === "archive" ? t("Archive") : t("Publish")}
        confirmVariant={confirm?.kind === "delete" ? "destructive" : "default"}
        submitting={publish.isPending || archive.isPending || remove.isPending}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "delete") remove.mutate(confirm.item.id);
          else if (confirm.kind === "archive") archive.mutate(confirm.item.id);
          else publish.mutate(confirm.item.id);
        }}
      />
    </div>
  );
}

const syllabusSchema = z
  .object({
    curriculumId: z.string().min(1, "Choose a curriculum"),
    academicYearId: z.string().optional(),
    classId: z.string().min(1, "Choose a class"),
    subjectId: z.string().min(1, "Choose a subject"),
    title: z.string().trim().min(1, "Give the syllabus a title").max(200),
    startDate: z.string().optional(),
    completionDeadline: z.string().optional(),
    textbooks: z.string().max(2000).optional(),
    referenceMaterials: z.string().max(2000).optional(),
    learningObjectives: z.string().max(4000).optional(),
  })
  .refine((v) => !v.startDate || !v.completionDeadline || v.completionDeadline >= v.startDate, { path: ["completionDeadline"], message: "The deadline can't be before the start" });
type SyllabusForm = z.infer<typeof syllabusSchema>;

function SyllabusFormDialog({
  open,
  editing,
  onOpenChange,
  curricula,
  data,
  defaultYear,
}: {
  open: boolean;
  editing: SyllabusSummary | null;
  onOpenChange: (open: boolean) => void;
  curricula: Curriculum[];
  data: ReturnType<typeof useReferenceData>;
  defaultYear?: string;
}) {
  const { t } = useTranslation("lesson-portions");
  const { register, handleSubmit, control, reset, setValue, watch, formState } = useForm<SyllabusForm>({ resolver: zodResolver(syllabusSchema) });
  const { errors, isDirty } = formState;
  // The list rows carry no long text, so editing loads the whole syllabus - otherwise saving would blank the textbooks and objectives.
  const detail = useQuery({ queryKey: ["portions", "syllabus", editing?.id], queryFn: () => getSyllabus(editing!.id), enabled: open && Boolean(editing) });

  useEffect(() => {
    if (!open) return;
    if (editing && !detail.data) return;
    reset(
      editing
        ? {
            curriculumId: editing.curriculumId,
            academicYearId: editing.academicYearId ?? undefined,
            classId: editing.classId,
            subjectId: editing.subjectId,
            title: editing.title,
            startDate: editing.startDate ?? "",
            completionDeadline: editing.completionDeadline ?? "",
            textbooks: detail.data?.textbooks ?? "",
            referenceMaterials: detail.data?.referenceMaterials ?? "",
            learningObjectives: detail.data?.learningObjectives ?? "",
          }
        : { curriculumId: curricula.find((c) => c.isActive)?.id ?? "", academicYearId: defaultYear, classId: "", subjectId: "", title: "", startDate: "", completionDeadline: "", textbooks: "", referenceMaterials: "", learningObjectives: "" },
    );
  }, [open, editing, detail.data, curricula, defaultYear, reset]);

  const save = useApiMutation(
    (v: SyllabusForm) => {
      const body = { ...v, startDate: v.startDate || null, completionDeadline: v.completionDeadline || null, academicYearId: v.academicYearId || null, rowVersion: editing?.rowVersion };
      return editing ? updateSyllabus(editing.id, body) : createSyllabus(body);
    },
    { success: editing ? "Syllabus updated" : "Syllabus created as a draft. Add chapters, then publish it.", onSuccess: () => onOpenChange(false) },
  );

  const classId = watch("classId");
  const subjectId = watch("subjectId");
  // Suggest a title the first time both are chosen.
  useEffect(() => {
    if (editing || !classId || !subjectId || formState.dirtyFields.title) return;
    const c = data.classes.find((x) => x.id === classId)?.name;
    const s = data.subjects.find((x) => x.id === subjectId)?.name;
    if (c && s) setValue("title", `${s} · ${c}`);
  }, [classId, subjectId, editing, data.classes, data.subjects, setValue, formState.dirtyFields.title]);

  const subjects = data.subjects.filter((s) => !classId || s.classIds.length === 0 || s.classIds.includes(classId));
  return (
    <Dialog open={open} onOpenChange={guardedClose(isDirty, save.isPending, onOpenChange)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing ? t("Edit syllabus") : t("New syllabus plan")}</DialogTitle>
          <DialogDescription>{t("One syllabus per academic year, class, subject and curriculum. Revisions are saved as new versions.")}</DialogDescription>
        </DialogHeader>
        <form id="syllabus-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 overflow-y-auto" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("Curriculum")} htmlFor="sy-curriculum" required error={errors.curriculumId?.message}>
              <Controller control={control} name="curriculumId" render={({ field }) => <SelectField id="sy-curriculum" value={field.value} onChange={(v) => field.onChange(v ?? "")} items={curricula.filter((c) => c.isActive).map((c) => ({ value: c.id, label: `${c.name} (${BOARD_LABEL[c.board]})` }))} placeholder={t("Choose")} className="w-full" invalid={Boolean(errors.curriculumId)} />} />
            </FormField>
            <FormField label={t("Academic year")} htmlFor="sy-year" required error={errors.academicYearId?.message}>
              <Controller control={control} name="academicYearId" render={({ field }) => <SelectField id="sy-year" value={field.value} onChange={field.onChange} items={data.years.map((y) => ({ value: y.id, label: y.name }))} className="w-full" disabled={Boolean(editing)} />} />
            </FormField>
            <FormField label={t("Class")} htmlFor="sy-class" required error={errors.classId?.message}>
              <Controller control={control} name="classId" render={({ field }) => <SelectField id="sy-class" value={field.value} onChange={(v) => field.onChange(v ?? "")} items={data.classes.map((c) => ({ value: c.id, label: c.name }))} placeholder={t("Choose")} className="w-full" invalid={Boolean(errors.classId)} />} />
            </FormField>
            <FormField label={t("Subject")} htmlFor="sy-subject" required error={errors.subjectId?.message}>
              <Controller control={control} name="subjectId" render={({ field }) => <SelectField id="sy-subject" value={field.value} onChange={(v) => field.onChange(v ?? "")} items={subjects.map((c) => ({ value: c.id, label: c.name }))} placeholder={t("Choose")} className="w-full" invalid={Boolean(errors.subjectId)} />} />
            </FormField>
          </div>
          <FormField label={t("Title")} htmlFor="sy-title" required error={errors.title?.message}>
            <Input id="sy-title" {...register("title")} aria-invalid={errors.title ? true : undefined} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("Teaching starts")} htmlFor="sy-start" optional error={errors.startDate?.message}>
              <Input id="sy-start" type="date" {...register("startDate")} />
            </FormField>
            <FormField label={t("Complete by")} htmlFor="sy-end" optional error={errors.completionDeadline?.message} hint={t("Usually the end of the last term.")}>
              <Input id="sy-end" type="date" {...register("completionDeadline")} aria-invalid={errors.completionDeadline ? true : undefined} />
            </FormField>
          </div>
          <FormField label={t("Textbooks")} htmlFor="sy-books" optional error={errors.textbooks?.message}>
            <Textarea id="sy-books" rows={2} {...register("textbooks")} />
          </FormField>
          <FormField label={t("Reference materials")} htmlFor="sy-refs" optional error={errors.referenceMaterials?.message}>
            <Textarea id="sy-refs" rows={2} {...register("referenceMaterials")} />
          </FormField>
          <FormField label={t("Learning objectives")} htmlFor="sy-obj" optional error={errors.learningObjectives?.message}>
            <Textarea id="sy-obj" rows={3} {...register("learningObjectives")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => guardedClose(isDirty, save.isPending, onOpenChange)(false)}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form="syllabus-form" loading={save.isPending} disabled={Boolean(editing) && !detail.data}>
            {editing ? t("Save changes") : t("Create syllabus")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SaveTemplateDialog({ source, onClose }: { source: SyllabusSummary | null; onClose: () => void }) {
  const { t } = useTranslation("lesson-portions");
  const [name, setName] = useState("");
  useEffect(() => setName(source ? `${source.subjectName} · ${source.className} template` : ""), [source]);
  const save = useApiMutation((n: string) => saveSyllabusAsTemplate(source!.id, n), { success: "Saved as a template", onSuccess: onClose });
  return (
    <Dialog open={Boolean(source)} onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Save as template")}</DialogTitle>
          <DialogDescription>{t("Keeps the chapters, topics, periods and dates so next year's syllabus can start from them.")}</DialogDescription>
        </DialogHeader>
        <FormField label={t("Template name")} htmlFor="tpl-name" required error={name.trim() ? undefined : "Give the template a name"}>
          <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={150} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            {t("Cancel")}
          </Button>
          <Button onClick={() => save.mutate(name.trim())} disabled={!name.trim()} loading={save.isPending}>
            {t("Save template")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Templates ───────────────────────────────────────────────────────────────

function TemplatesTab({ canManage }: { canManage: boolean }) {
  const { t } = useTranslation("lesson-portions");
  const data = useReferenceData();
  const list = useQuery({ queryKey: ["portions", "syllabi", "templates"], queryFn: () => listSyllabi({ templates: true, pageSize: 200 }) });
  const [use, setUse] = useState<SyllabusSummary | null>(null);
  const remove = useApiMutation(deleteSyllabus, { success: "Template deleted" });

  const columns: ColumnDef<SyllabusSummary, unknown>[] = [
    {
      id: "name",
      header: t("Template"),
      accessorFn: (r) => r.templateName ?? r.title,
      cell: ({ row }) => (
        <div>
          <Link to={`/lesson-portions/syllabus/${row.original.id}`} className="text-sm font-medium hover:underline">
            {row.original.templateName ?? row.original.title}
          </Link>
          <p className="text-xs text-muted-foreground">
            {row.original.className} · {row.original.subjectName} · {row.original.curriculumName}
          </p>
        </div>
      ),
    },
    { id: "chapters", header: t("Chapters"), accessorFn: (r) => r.chapterCount, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.chapterCount}</span> },
    { id: "periods", header: t("Periods"), accessorFn: (r) => r.plannedPeriods, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.plannedPeriods}</span> },
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            enableSorting: false,
            cell: ({ row }) => (
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setUse(row.original)}>
                  {t("Use for a new year")}
                </Button>
                <Button size="icon-sm" variant="ghost" aria-label={t("Delete {{templateName}}", { templateName: row.original.templateName })} onClick={() => window.confirm("Delete this template?") && remove.mutate(row.original.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ),
          } satisfies ColumnDef<SyllabusSummary, unknown>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={list.data?.items ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        pageSize={10}
        empty={{ icon: FileStack, title: t("No templates yet"), description: t("Open a syllabus and choose Save as template to reuse it across academic years.") }}
      />
      <UseTemplateDialog template={use} onClose={() => setUse(null)} data={data} />
    </>
  );
}

function UseTemplateDialog({ template, onClose, data }: { template: SyllabusSummary | null; onClose: () => void; data: ReturnType<typeof useReferenceData> }) {
  const { t } = useTranslation("lesson-portions");
  const [yearId, setYearId] = useState<string | undefined>();
  const [classIds, setClassIds] = useState<string[]>([]);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  useEffect(() => {
    if (template) {
      setYearId(data.currentYearId);
      setClassIds([template.classId]);
      setStart(template.startDate ?? "");
      setEnd(template.completionDeadline ?? "");
    }
  }, [template, data.currentYearId]);

  const create = useApiMutation(
    () => syllabusFromTemplate({ templateId: template!.id, academicYearId: yearId!, classIds, startDate: start || null, completionDeadline: end || null }),
    { success: (r) => (r.length === 0 ? "Nothing created: those classes already have this syllabus" : `${r.length} draft syllabus plan${r.length === 1 ? "" : "s"} created`), onSuccess: onClose },
  );
  const classes = useMemo(() => data.classes.filter((c) => !yearId || c.academicYearId === yearId || true), [data.classes, yearId]);
  const invalid = !yearId || classIds.length === 0 || (Boolean(start) && Boolean(end) && end < start);

  return (
    <Dialog open={Boolean(template)} onOpenChange={(open) => !open && !create.isPending && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("Create from template")}</DialogTitle>
          <DialogDescription>
            {t("Copies \"")}{template?.templateName}{t("\" into an academic year as a draft for each class you choose. Chapter dates move by the same number of days as the new start date.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto">
          <FormField label={t("Academic year")} htmlFor="ut-year" required>
            <SelectField id="ut-year" value={yearId} onChange={setYearId} items={data.years.map((y) => ({ value: y.id, label: y.name }))} className="w-full" />
          </FormField>
          <FormField label={t("Classes")} required hint={t("Classes that already have this syllabus are skipped.")}>
            <div role="group" aria-label={t("Classes")} className="flex flex-wrap gap-1.5">
              {classes.map((c) => (
                <ToggleChip key={c.id} pressed={classIds.includes(c.id)} onClick={() => setClassIds((ids) => (ids.includes(c.id) ? ids.filter((x) => x !== c.id) : [...ids, c.id]))}>
                  {c.name}
                </ToggleChip>
              ))}
            </div>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("Teaching starts")} htmlFor="ut-start" optional>
              <Input id="ut-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </FormField>
            <FormField label={t("Complete by")} htmlFor="ut-end" optional error={start && end && end < start ? "The deadline can't be before the start" : undefined}>
              <Input id="ut-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </FormField>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={create.isPending}>
            {t("Cancel")}
          </Button>
          <Button onClick={() => create.mutate(undefined)} disabled={invalid} loading={create.isPending}>
            {t("Create drafts")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Curricula ───────────────────────────────────────────────────────────────

const curriculumSchema = z.object({
  name: z.string().trim().min(1, "Give the curriculum a name").max(150),
  board: z.string().min(1),
  description: z.string().max(1000).optional(),
  isActive: z.boolean(),
});
type CurriculumForm = z.infer<typeof curriculumSchema>;

function CurriculaTab({ canManage }: { canManage: boolean }) {
  const { t } = useTranslation("lesson-portions");
  const list = useQuery({ queryKey: ["portions", "curricula"], queryFn: listCurricula });
  const [form, setForm] = useState<{ open: boolean; editing: Curriculum | null }>({ open: false, editing: null });
  const [toDelete, setToDelete] = useState<Curriculum | null>(null);
  const remove = useApiMutation(deleteCurriculum, { success: "Curriculum deleted", onSuccess: () => setToDelete(null) });

  const columns: ColumnDef<Curriculum, unknown>[] = [
    { id: "name", header: t("Curriculum"), accessorFn: (r) => r.name, cell: ({ row }) => <span className="text-sm font-medium">{row.original.name}</span> },
    { id: "board", header: t("Board"), accessorFn: (r) => BOARD_LABEL[r.board], cell: ({ row }) => <span className="text-sm">{BOARD_LABEL[row.original.board]}</span> },
    { id: "count", header: t("Syllabus plans"), accessorFn: (r) => r.syllabusCount, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.syllabusCount}</span> },
    { id: "active", header: t("Status"), accessorFn: (r) => (r.isActive ? "Active" : "Inactive"), cell: ({ row }) => <Badge variant={row.original.isActive ? "success" : "neutral"}>{row.original.isActive ? t("Active") : t("Inactive")}</Badge> },
    ...(canManage
      ? [
          {
            id: "actions",
            header: "",
            enableSorting: false,
            cell: ({ row }) => (
              <RowActions label={t("Actions for {{name}}", { name: row.original.name })}>
                <DropdownMenuItem onClick={() => setForm({ open: true, editing: row.original })}>
                  <Pencil /> {t("Edit")}
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setToDelete(row.original)}>
                  <Trash2 /> {t("Delete")}
                </DropdownMenuItem>
              </RowActions>
            ),
          } satisfies ColumnDef<Curriculum, unknown>,
        ]
      : []),
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={list.data ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        pageSize={10}
        empty={{ icon: BookCopy, title: t("No curricula yet"), description: canManage ? "Add CBSE, ICSE, Kerala State Board or your own curriculum, then create syllabus plans under it." : "Your school hasn't added a curriculum yet." }}
        actions={
          canManage && (
            <Button onClick={() => setForm({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> {t("Add curriculum")}
            </Button>
          )
        }
      />
      <CurriculumDialog open={form.open} editing={form.editing} onOpenChange={(open) => setForm({ open, editing: open ? form.editing : null })} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title={t("Delete this curriculum?")}
        description={t("A curriculum with syllabus plans can't be deleted; mark it inactive instead.")}
        confirmLabel={t("Delete")}
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => { if (toDelete) remove.mutate(toDelete.id); }}
      />
    </>
  );
}

function CurriculumDialog({ open, editing, onOpenChange }: { open: boolean; editing: Curriculum | null; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation("lesson-portions");
  const { register, handleSubmit, control, reset, formState } = useForm<CurriculumForm>({ resolver: zodResolver(curriculumSchema) });
  const { errors, isDirty } = formState;
  useEffect(() => {
    if (open) reset(editing ? { name: editing.name, board: editing.board, description: editing.description ?? "", isActive: editing.isActive } : { name: "", board: "Cbse", description: "", isActive: true });
  }, [open, editing, reset]);
  const save = useApiMutation(
    (v: CurriculumForm) => {
      const body = { ...v, board: v.board as CurriculumBoard, rowVersion: editing?.rowVersion };
      return editing ? updateCurriculum(editing.id, body) : createCurriculum(body);
    },
    { success: editing ? "Curriculum updated" : "Curriculum added", onSuccess: () => onOpenChange(false) },
  );

  return (
    <Dialog open={open} onOpenChange={guardedClose(isDirty, save.isPending, onOpenChange)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t("Edit curriculum") : t("Add curriculum")}</DialogTitle>
          <DialogDescription>{t("The board's curriculum your school follows for some classes or subjects.")}</DialogDescription>
        </DialogHeader>
        <form id="curriculum-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
          <FormField label={t("Name")} htmlFor="cu-name" required error={errors.name?.message}>
            <Input id="cu-name" {...register("name")} placeholder={t("e.g. CBSE 2026")} aria-invalid={errors.name ? true : undefined} />
          </FormField>
          <FormField label={t("Board")} htmlFor="cu-board" required>
            <Controller control={control} name="board" render={({ field }) => <SelectField id="cu-board" value={field.value} onChange={(v) => field.onChange(v ?? "Other")} items={options(BOARD_LABEL)} className="w-full" />} />
          </FormField>
          <FormField label={t("Description")} htmlFor="cu-desc" optional error={errors.description?.message}>
            <Textarea id="cu-desc" rows={2} {...register("description")} />
          </FormField>
          <Controller
            control={control}
            name="isActive"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  {t("Active")}
                  <span className="block text-xs text-muted-foreground">{t("Inactive curricula can't be chosen for new syllabus plans.")}</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label={t("Active")} />
              </label>
            )}
          />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => guardedClose(isDirty, save.isPending, onOpenChange)(false)}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form="curriculum-form" loading={save.isPending}>
            {editing ? t("Save changes") : t("Add curriculum")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
