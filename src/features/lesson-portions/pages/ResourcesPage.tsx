import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { ExternalLink, FolderOpen, Library, Pencil, Plus, Trash2 } from "lucide-react";
import { z } from "zod";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/ui/row-actions";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { listStudyMaterials } from "@/features/study-materials/api";
import { createResource, deleteResource, getSyllabus, listResources, listSyllabi, updateResource } from "../api";
import { RESOURCE_KIND_LABEL, SelectField, guardedClose, options, useApiMutation, usePortionAccess } from "../shared";
import type { Resource, ResourceKind, SyllabusSummary } from "../types";

export default function ResourcesPage() {
  const access = usePortionAccess();
  const canEdit = access.canManage || access.canPlan || access.canProgress;
  const [syllabusId, setSyllabusId] = useState<string | undefined>();
  const [kind, setKind] = useState<ResourceKind | undefined>();
  const syllabi = useQuery({ queryKey: ["portions", "syllabi", "all-for-resources"], queryFn: () => listSyllabi({ pageSize: 200 }) });
  const list = useQuery({ queryKey: ["portions", "resources", syllabusId], queryFn: () => listResources({ syllabusPlanId: syllabusId }) });
  const [form, setForm] = useState<{ open: boolean; editing: Resource | null }>({ open: false, editing: null });
  const [toDelete, setToDelete] = useState<Resource | null>(null);
  const remove = useApiMutation(deleteResource, { success: "Resource removed", invalidate: [["portions", "resources"]], onSuccess: () => setToDelete(null) });
  const nameOf = (id?: string | null) => syllabi.data?.items.find((s) => s.id === id)?.title ?? "—";

  const columns: ColumnDef<Resource, unknown>[] = [
    {
      id: "title",
      header: "Resource",
      accessorFn: (r) => r.title,
      cell: ({ row }) => (
        <div className="min-w-0">
          <p className="text-sm font-medium">{row.original.title}</p>
          {row.original.note && <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.note}</p>}
        </div>
      ),
    },
    { id: "kind", header: "Type", accessorFn: (r) => RESOURCE_KIND_LABEL[r.kind], cell: ({ row }) => <Badge variant="info">{RESOURCE_KIND_LABEL[row.original.kind]}</Badge> },
    { id: "syllabus", header: "Syllabus", accessorFn: (r) => nameOf(r.syllabusPlanId), cell: ({ row }) => <span className="text-sm">{nameOf(row.original.syllabusPlanId)}</span> },
    {
      id: "source",
      header: "Opens",
      enableSorting: false,
      accessorFn: (r) => r.url ?? (r.studyMaterialId ? "Study material" : ""),
      cell: ({ row }) =>
        row.original.url ? (
          <a href={row.original.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
            Open link <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
          </a>
        ) : (
          <Link to="/study-materials" className="text-sm text-primary hover:underline">
            In Study Materials
          </Link>
        ),
    },
    { id: "families", header: "Families", accessorFn: (r) => (r.visibleToFamilies ? "Visible" : "Hidden"), cell: ({ row }) => <Badge variant={row.original.visibleToFamilies ? "success" : "neutral"}>{row.original.visibleToFamilies ? "Visible" : "Staff only"}</Badge> },
    ...(canEdit
      ? [
          {
            id: "actions",
            header: "",
            enableSorting: false,
            cell: ({ row }) => (
              <RowActions label={`Actions for ${row.original.title}`}>
                <DropdownMenuItem onClick={() => setForm({ open: true, editing: row.original })}>
                  <Pencil /> Edit
                </DropdownMenuItem>
                <DropdownMenuItem variant="destructive" onClick={() => setToDelete(row.original)}>
                  <Trash2 /> Remove
                </DropdownMenuItem>
              </RowActions>
            ),
          } satisfies ColumnDef<Resource, unknown>,
        ]
      : []),
  ];

  const rows = (list.data ?? []).filter((r) => !kind || r.kind === kind);
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Link textbooks, reference notes, presentations and worksheets to a syllabus, chapter or topic. Files are uploaded in{" "}
        <Link to="/study-materials" className="text-primary hover:underline">
          Study Materials
        </Link>{" "}
        and attached here, so there is one place for files and one set of access rules.
      </p>
      <DataTable
        searchable
        searchPlaceholder="Search resources…"
        columns={columns}
        data={rows}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        exportFileName="lesson-resources"
        pageSize={10}
        empty={{ icon: FolderOpen, title: "No resources yet", description: canEdit ? "Add a link or attach a study material to a syllabus." : "Nothing has been attached to the syllabus yet." }}
        filters={
          <>
            <SelectField aria-label="Syllabus" value={syllabusId} onChange={setSyllabusId} allLabel="All syllabus plans" items={(syllabi.data?.items ?? []).map((s) => ({ value: s.id, label: `${s.title} (${s.className})` }))} className="w-64" />
            <SelectField aria-label="Type" value={kind} onChange={setKind} allLabel="All types" items={options(RESOURCE_KIND_LABEL)} className="w-40" />
          </>
        }
        actions={
          canEdit && (
            <Button onClick={() => setForm({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> Add resource
            </Button>
          )
        }
      />
      <ResourceDialog open={form.open} editing={form.editing} onOpenChange={(open) => setForm({ open, editing: open ? form.editing : null })} syllabi={syllabi.data?.items ?? []} defaultSyllabus={syllabusId} />
      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => !open && setToDelete(null)}
        title="Remove this resource?"
        description="It is detached from the syllabus. Any file in Study Materials stays there."
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => { if (toDelete) remove.mutate(toDelete.id); }}
      />
    </div>
  );
}

const resourceSchema = z
  .object({
    syllabusPlanId: z.string().min(1, "Choose the syllabus it belongs to"),
    syllabusChapterId: z.string().optional(),
    syllabusTopicId: z.string().optional(),
    kind: z.string().min(1),
    title: z.string().trim().min(1, "Give the resource a title").max(200),
    source: z.enum(["link", "material"]),
    url: z.string().optional(),
    studyMaterialId: z.string().optional(),
    note: z.string().max(1000).optional(),
    visibleToFamilies: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.source === "link") {
      if (!v.url?.trim()) return void ctx.addIssue({ code: "custom", path: ["url"], message: "Paste the web link" });
      try {
        const u = new URL(v.url.trim());
        if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error("scheme");
      } catch {
        ctx.addIssue({ code: "custom", path: ["url"], message: "Use a web link that starts with http:// or https://" });
      }
    } else if (!v.studyMaterialId) ctx.addIssue({ code: "custom", path: ["studyMaterialId"], message: "Choose a study material" });
  });
type ResourceForm = z.infer<typeof resourceSchema>;

function ResourceDialog({ open, editing, onOpenChange, syllabi, defaultSyllabus }: { open: boolean; editing: Resource | null; onOpenChange: (o: boolean) => void; syllabi: SyllabusSummary[]; defaultSyllabus?: string }) {
  const { register, handleSubmit, control, reset, watch, setValue, formState } = useForm<ResourceForm>({ resolver: zodResolver(resourceSchema) });
  const { errors, isDirty } = formState;
  useEffect(() => {
    if (!open) return;
    reset(
      editing
        ? { syllabusPlanId: editing.syllabusPlanId ?? "", syllabusChapterId: editing.syllabusChapterId ?? "", syllabusTopicId: editing.syllabusTopicId ?? "", kind: editing.kind, title: editing.title, source: editing.studyMaterialId ? "material" : "link", url: editing.url ?? "", studyMaterialId: editing.studyMaterialId ?? "", note: editing.note ?? "", visibleToFamilies: editing.visibleToFamilies }
        : { syllabusPlanId: defaultSyllabus ?? "", syllabusChapterId: "", syllabusTopicId: "", kind: "Reference", title: "", source: "link", url: "", studyMaterialId: "", note: "", visibleToFamilies: false },
    );
  }, [open, editing, defaultSyllabus, reset]);

  const syllabusId = watch("syllabusPlanId");
  const chapterId = watch("syllabusChapterId");
  const source = watch("source");
  const detail = useQuery({ queryKey: ["portions", "syllabus", syllabusId], queryFn: () => getSyllabus(syllabusId), enabled: open && Boolean(syllabusId) });
  const materials = useQuery({ queryKey: ["portions", "materials"], queryFn: () => listStudyMaterials({ view: "browse", scope: "school" }), enabled: open && source === "material" });
  const chapters = detail.data?.chapters ?? [];
  const topics = chapters.find((c) => c.id === chapterId)?.topics ?? [];

  const save = useApiMutation(
    (v: ResourceForm) => {
      const body = { syllabusPlanId: v.syllabusPlanId, syllabusChapterId: v.syllabusChapterId || null, syllabusTopicId: v.syllabusTopicId || null, kind: v.kind as ResourceKind, title: v.title, url: v.source === "link" ? v.url?.trim() : undefined, studyMaterialId: v.source === "material" ? v.studyMaterialId : null, note: v.note, visibleToFamilies: v.visibleToFamilies, rowVersion: editing?.rowVersion };
      return editing ? updateResource(editing.id, body) : createResource(body);
    },
    { success: editing ? "Resource updated" : "Resource added", invalidate: [["portions", "resources"], ["portions", "syllabus"]], onSuccess: () => onOpenChange(false) },
  );
  const close = guardedClose(isDirty, save.isPending, onOpenChange);

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit resource" : "Add resource"}</DialogTitle>
          <DialogDescription>Attach to a whole syllabus, or narrow it to a chapter or topic.</DialogDescription>
        </DialogHeader>
        <form id="resource-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 overflow-y-auto" noValidate>
          <FormField label="Syllabus" htmlFor="rs-syllabus" required error={errors.syllabusPlanId?.message}>
            <Controller control={control} name="syllabusPlanId" render={({ field }) => <SelectField id="rs-syllabus" value={field.value || undefined} onChange={(v) => { field.onChange(v ?? ""); setValue("syllabusChapterId", ""); setValue("syllabusTopicId", ""); }} items={syllabi.filter((s) => !s.isTemplate && s.status !== "Archived").map((s) => ({ value: s.id, label: `${s.title} (${s.className})` }))} placeholder="Choose" className="w-full" invalid={Boolean(errors.syllabusPlanId)} />} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Chapter" htmlFor="rs-chapter" optional>
              <Controller control={control} name="syllabusChapterId" render={({ field }) => <SelectField id="rs-chapter" value={field.value || undefined} onChange={(v) => { field.onChange(v ?? ""); setValue("syllabusTopicId", ""); }} allLabel="Whole syllabus" disabled={!syllabusId} items={chapters.map((c) => ({ value: c.id, label: c.title }))} className="w-full" />} />
            </FormField>
            <FormField label="Topic" htmlFor="rs-topic" optional>
              <Controller control={control} name="syllabusTopicId" render={({ field }) => <SelectField id="rs-topic" value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} allLabel="Whole chapter" disabled={!chapterId} items={topics.map((t) => ({ value: t.id, label: t.title }))} className="w-full" />} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
            <FormField label="Title" htmlFor="rs-title" required error={errors.title?.message}>
              <Input id="rs-title" {...register("title")} aria-invalid={errors.title ? true : undefined} />
            </FormField>
            <FormField label="Type" htmlFor="rs-kind" required>
              <Controller control={control} name="kind" render={({ field }) => <SelectField id="rs-kind" value={field.value} onChange={(v) => field.onChange(v ?? "Other")} items={options(RESOURCE_KIND_LABEL)} className="w-full" />} />
            </FormField>
          </div>
          <FormField label="Where is it?" htmlFor="rs-source" required>
            <Controller control={control} name="source" render={({ field }) => <SelectField id="rs-source" value={field.value} onChange={(v) => field.onChange(v ?? "link")} items={[{ value: "link", label: "A web link" }, { value: "material", label: "A study material from this school" }]} className="w-full" />} />
          </FormField>
          {source === "link" ? (
            <FormField label="Web link" htmlFor="rs-url" required error={errors.url?.message}>
              <Input id="rs-url" type="url" inputMode="url" placeholder="https://" {...register("url")} aria-invalid={errors.url ? true : undefined} />
            </FormField>
          ) : (
            <FormField label="Study material" htmlFor="rs-material" required error={errors.studyMaterialId?.message} hint="Upload new files in Study Materials, then attach them here.">
              <Controller control={control} name="studyMaterialId" render={({ field }) => <SelectField id="rs-material" value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} placeholder={materials.isLoading ? "Loading…" : "Choose"} items={(materials.data ?? []).map((m) => ({ value: m.id, label: m.title }))} className="w-full" invalid={Boolean(errors.studyMaterialId)} />} />
            </FormField>
          )}
          <FormField label="Note" htmlFor="rs-note" optional error={errors.note?.message}>
            <Textarea id="rs-note" rows={2} {...register("note")} />
          </FormField>
          <Controller
            control={control}
            name="visibleToFamilies"
            render={({ field }) => (
              <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                <span>
                  Show to students and parents
                  <span className="block text-xs text-muted-foreground">Only when your school turns the family view on and the syllabus is published.</span>
                </span>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Show to students and parents" />
              </label>
            )}
          />
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button type="submit" form="resource-form" loading={save.isPending}>
            {editing ? "Save changes" : "Add resource"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { Library };
