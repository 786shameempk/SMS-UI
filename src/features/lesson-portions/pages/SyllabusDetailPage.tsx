import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Download, FileUp, ListPlus, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { z } from "zod";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { downloadCsv } from "@/utils/csv";
import { normalizeDate, parseCsv, rowsToRecords } from "@/utils/csvParse";
import { addChapter, addTopic, deleteChapter, deleteTopic, getSyllabus, importSyllabus, newSyllabusVersion, publishSyllabus, reorderChapters, reorderTopics, updateChapter, updateTopic } from "../api";
import { Detail } from "../components/bits";
import { SYLLABUS_STATUS, StatusBadge, formatDate, guardedClose, useApiMutation, usePortionAccess } from "../shared";
import type { Chapter, ImportRow, SyllabusDetail, Topic } from "../types";

import { useTranslation } from "react-i18next";
export default function SyllabusDetailPage() {
  const { t: tr } = useTranslation("lesson-portions");
  const { id = "" } = useParams();
  const access = usePortionAccess();
  const query = useQuery({ queryKey: ["portions", "syllabus", id], queryFn: () => getSyllabus(id), enabled: Boolean(id) });
  const [chapterDialog, setChapterDialog] = useState<{ open: boolean; editing: Chapter | null }>({ open: false, editing: null });
  const [topicDialog, setTopicDialog] = useState<{ chapter: Chapter; editing: Topic | null; parent?: Topic } | null>(null);
  const [importing, setImporting] = useState(false);
  const [confirm, setConfirm] = useState<{ kind: "chapter" | "topic" | "publish"; id: string; label: string } | null>(null);

  const invalidate = [["portions", "syllabus", id], ["portions", "syllabi"]];
  const removeChapter = useApiMutation(deleteChapter, { success: "Chapter deleted", invalidate, onSuccess: () => setConfirm(null) });
  const removeTopic = useApiMutation(deleteTopic, { success: "Topic deleted", invalidate, onSuccess: () => setConfirm(null) });
  const publish = useApiMutation(() => publishSyllabus(id), { success: "Syllabus published", invalidate, onSuccess: () => setConfirm(null) });
  const version = useApiMutation(() => newSyllabusVersion(id), { success: (s) => `Version ${s.version} created as a draft`, invalidate });
  const moveChapters = useApiMutation((ids: string[]) => reorderChapters(id, ids), { invalidate });
  const moveTopics = useApiMutation((v: { chapterId: string; ids: string[] }) => reorderTopics(v.chapterId, v.ids), { invalidate });

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />;
  const d = query.data;
  const s = d.summary;
  const editable = access.canManage && s.status !== "Archived";
  const swap = <T extends { id: string }>(items: T[], index: number, delta: number) => {
    const ids = items.map((i) => i.id);
    [ids[index], ids[index + delta]] = [ids[index + delta], ids[index]];
    return ids;
  };

  return (
    <div className="space-y-5">
      <Link to="/lesson-portions/syllabus" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" /> {tr("All syllabus plans")}
      </Link>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">{s.isTemplate ? (s.templateName ?? s.title) : s.title}</h2>
              <p className="text-sm text-muted-foreground">{tr("{{className}} · {{subjectName}} · {{curriculumName}} · version {{version}}", { className: s.className, subjectName: s.subjectName, curriculumName: s.curriculumName, version: s.version })}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {s.isTemplate ? <Badge variant="info">{tr("Template")}</Badge> : <StatusBadge map={SYLLABUS_STATUS} value={s.status} />}
              {editable && (
                <>
                  <Button size="sm" variant="outline" onClick={() => setImporting(true)}>
                    <FileUp className="h-4 w-4" /> {tr("Import CSV")}
                  </Button>
                  {!s.isTemplate && s.status === "Draft" && (
                    <Button size="sm" onClick={() => setConfirm({ kind: "publish", id, label: s.title })} disabled={d.chapters.length === 0}>
                      <Send className="h-4 w-4" /> {tr("Publish")}
                    </Button>
                  )}
                </>
              )}
              {access.canManage && !s.isTemplate && (
                <Button size="sm" variant="outline" onClick={() => version.mutate(undefined)} loading={version.isPending}>
                  <Copy className="h-4 w-4" /> {tr("New version")}
                </Button>
              )}
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Detail label={tr("Chapters")}>{s.chapterCount}</Detail>
            <Detail label={tr("Topics")}>{s.topicCount}</Detail>
            <Detail label={tr("Planned periods")}>{s.plannedPeriods}</Detail>
            <Detail label={tr("Teaching window")}>
              {formatDate(s.startDate)} – {formatDate(s.completionDeadline)}
            </Detail>
          </dl>
          {(d.textbooks || d.referenceMaterials || d.learningObjectives) && (
            <dl className="grid gap-3 border-t border-border pt-3 sm:grid-cols-3">
              {d.textbooks && <Detail label={tr("Textbooks")}><span className="whitespace-pre-line">{d.textbooks}</span></Detail>}
              {d.referenceMaterials && <Detail label={tr("Reference materials")}><span className="whitespace-pre-line">{d.referenceMaterials}</span></Detail>}
              {d.learningObjectives && <Detail label={tr("Learning objectives")}><span className="whitespace-pre-line">{d.learningObjectives}</span></Detail>}
            </dl>
          )}
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-base font-semibold">{tr("Chapters and topics")}</h3>
        {editable && (
          <Button size="sm" onClick={() => setChapterDialog({ open: true, editing: null })}>
            <Plus className="h-4 w-4" /> {tr("Add chapter")}
          </Button>
        )}
      </div>

      {d.chapters.length === 0 ? (
        <EmptyState icon={ListPlus} title={tr("No chapters yet")} description={editable ? tr("Add chapters one by one, or import the whole syllabus from a CSV file.") : tr("The syllabus has no chapters yet.")} />
      ) : (
        <ol className="space-y-3">
          {d.chapters.map((c, ci) => (
            <li key={c.id}>
              <Card>
                <CardContent className="space-y-3 p-4">
                  <div className="flex flex-wrap items-start gap-3">
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">{ci + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">
                        {c.title}
                        {c.code && <span className="ms-2 text-xs text-muted-foreground">{c.code}</span>}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {c.plannedPeriods} {tr("periods · weight")} {c.weight}
                        {c.deadline ? tr(" · due {{v1}}", { v1: formatDate(c.deadline) }) : tr(" · no deadline")}
                      </p>
                      {c.learningObjectives && <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{c.learningObjectives}</p>}
                    </div>
                    {editable && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Button size="icon-sm" variant="ghost" aria-label={tr("Move {{title}} up", { title: c.title })} disabled={ci === 0 || moveChapters.isPending} onClick={() => moveChapters.mutate(swap(d.chapters, ci, -1))}>
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={tr("Move {{title}} down", { title: c.title })} disabled={ci === d.chapters.length - 1 || moveChapters.isPending} onClick={() => moveChapters.mutate(swap(d.chapters, ci, 1))}>
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={tr("Edit {{title}}", { title: c.title })} onClick={() => setChapterDialog({ open: true, editing: c })}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon-sm" variant="ghost" aria-label={tr("Delete {{title}}", { title: c.title })} onClick={() => setConfirm({ kind: "chapter", id: c.id, label: c.title })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>

                  <TopicList
                    chapter={c}
                    editable={editable}
                    busy={moveTopics.isPending}
                    onAdd={(parent) => setTopicDialog({ chapter: c, editing: null, parent })}
                    onEdit={(t) => setTopicDialog({ chapter: c, editing: t })}
                    onDelete={(t) => setConfirm({ kind: "topic", id: t.id, label: t.title })}
                    onMove={(index, delta) => {
                      const siblings = c.topics.filter((t) => !t.parentTopicId);
                      moveTopics.mutate({ chapterId: c.id, ids: [...swap(siblings, index, delta), ...c.topics.filter((t) => t.parentTopicId).map((t) => t.id)] });
                    }}
                  />
                  {editable && (
                    <Button size="sm" variant="ghost" onClick={() => setTopicDialog({ chapter: c, editing: null })}>
                      <Plus className="h-4 w-4" /> {tr("Add topic")}
                    </Button>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      )}

      <ChapterDialog open={chapterDialog.open} editing={chapterDialog.editing} planId={id} onOpenChange={(open) => setChapterDialog({ open, editing: open ? chapterDialog.editing : null })} invalidate={invalidate} deadlineHint={s.completionDeadline} />
      <TopicDialog target={topicDialog} onClose={() => setTopicDialog(null)} invalidate={invalidate} />
      <ImportDialog open={importing} onOpenChange={setImporting} detail={d} invalidate={invalidate} />

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(open) => !open && setConfirm(null)}
        title={confirm?.kind === "publish" ? tr("Publish this syllabus?") : tr("Delete \"{{label}}\"?", { label: confirm?.label })}
        description={
          confirm?.kind === "publish"
            ? tr("Teachers can then record progress against it. An earlier published version of the same syllabus is archived.")
            : tr("This can't be undone. Anything with teaching records, lesson plans or an exam portion can't be deleted; create a new version without it instead.")
        }
        confirmLabel={confirm?.kind === "publish" ? tr("Publish") : tr("Delete")}
        confirmVariant={confirm?.kind === "publish" ? "default" : "destructive"}
        submitting={removeChapter.isPending || removeTopic.isPending || publish.isPending}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.kind === "chapter") removeChapter.mutate(confirm.id);
          else if (confirm.kind === "topic") removeTopic.mutate(confirm.id);
          else publish.mutate(undefined);
        }}
      />
    </div>
  );
}

function TopicList({
  chapter,
  editable,
  busy,
  onAdd,
  onEdit,
  onDelete,
  onMove,
}: {
  chapter: Chapter;
  editable: boolean;
  busy: boolean;
  onAdd: (parent: Topic) => void;
  onEdit: (t: Topic) => void;
  onDelete: (t: Topic) => void;
  onMove: (index: number, delta: number) => void;
}) {
  const { t: tr } = useTranslation("lesson-portions");
  const top = chapter.topics.filter((t) => !t.parentTopicId).sort((a, b) => a.sequence - b.sequence);
  if (top.length === 0) return null;
  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {top.map((t, i) => {
        const subs = chapter.topics.filter((x) => x.parentTopicId === t.id).sort((a, b) => a.sequence - b.sequence);
        return (
          <li key={t.id}>
            <TopicRow topic={t} editable={editable} onEdit={onEdit} onDelete={onDelete} extra={
              editable && (
                <>
                  <Button size="icon-sm" variant="ghost" aria-label={tr("Move {{title}} up", { title: t.title })} disabled={i === 0 || busy} onClick={() => onMove(i, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={tr("Move {{title}} down", { title: t.title })} disabled={i === top.length - 1 || busy} onClick={() => onMove(i, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button size="icon-sm" variant="ghost" aria-label={tr("Add a subtopic to {{title}}", { title: t.title })} onClick={() => onAdd(t)}>
                    <ListPlus className="h-4 w-4" />
                  </Button>
                </>
              )
            } />
            {subs.length > 0 && (
              <ul className="border-t border-border/60 bg-muted/30">
                {subs.map((sub) => (
                  <li key={sub.id}>
                    <TopicRow topic={sub} editable={editable} onEdit={onEdit} onDelete={onDelete} indent />
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TopicRow({ topic, editable, onEdit, onDelete, extra, indent }: { topic: Topic; editable: boolean; onEdit: (t: Topic) => void; onDelete: (t: Topic) => void; extra?: React.ReactNode; indent?: boolean }) {
  const { t: tr } = useTranslation("lesson-portions");
  return (
    <div className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm ${indent ? "ps-8" : ""}`}>
      <span className="min-w-0 flex-1">{topic.title}</span>
      <span className="text-xs text-muted-foreground">{topic.plannedPeriods} {tr("period")}{topic.plannedPeriods === 1 ? "" : "s"}</span>
      {editable && (
        <span className="flex items-center gap-0.5">
          {extra}
          <Button size="icon-sm" variant="ghost" aria-label={tr("Edit {{title}}", { title: topic.title })} onClick={() => onEdit(topic)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon-sm" variant="ghost" aria-label={tr("Delete {{title}}", { title: topic.title })} onClick={() => onDelete(topic)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </span>
      )}
    </div>
  );
}

// ── Chapter dialog ──────────────────────────────────────────────────────────

const chapterSchema = z
  .object({
    title: z.string().trim().min(1, "Give the chapter a title").max(200),
    code: z.string().max(30).optional(),
    plannedPeriods: z.coerce.number({ message: "Enter a number" }).int().min(0, "At least 0").max(1000, "At most 1000"),
    weight: z.coerce.number({ message: "Enter a number" }).gt(0, "Above 0").max(100, "At most 100"),
    startDate: z.string().optional(),
    deadline: z.string().optional(),
    learningObjectives: z.string().max(4000).optional(),
  })
  .refine((v) => !v.startDate || !v.deadline || v.deadline >= v.startDate, { path: ["deadline"], message: "The deadline can't be before the start" });
type ChapterForm = z.input<typeof chapterSchema>;

function ChapterDialog({ open, editing, planId, onOpenChange, invalidate, deadlineHint }: { open: boolean; editing: Chapter | null; planId: string; onOpenChange: (o: boolean) => void; invalidate: string[][]; deadlineHint?: string | null }) {
  const { t } = useTranslation("lesson-portions");
  const { register, handleSubmit, reset, formState } = useForm<ChapterForm, unknown, z.output<typeof chapterSchema>>({ resolver: zodResolver(chapterSchema) });
  const { errors, isDirty } = formState;
  useEffect(() => {
    if (open) reset(editing ? { title: editing.title, code: editing.code ?? "", plannedPeriods: editing.plannedPeriods, weight: editing.weight, startDate: editing.startDate ?? "", deadline: editing.deadline ?? "", learningObjectives: editing.learningObjectives ?? "" } : { title: "", code: "", plannedPeriods: 4, weight: 1, startDate: "", deadline: "", learningObjectives: "" });
  }, [open, editing, reset]);
  const save = useApiMutation(
    (v: z.output<typeof chapterSchema>) => {
      const body = { ...v, startDate: v.startDate || null, deadline: v.deadline || null, rowVersion: editing?.rowVersion };
      return editing ? updateChapter(editing.id, body) : addChapter(planId, body);
    },
    { success: editing ? "Chapter updated" : "Chapter added", invalidate, onSuccess: () => onOpenChange(false) },
  );
  return (
    <Dialog open={open} onOpenChange={guardedClose(isDirty, save.isPending, onOpenChange)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{editing ? t("Edit chapter") : t("Add chapter")}</DialogTitle>
          <DialogDescription>{t("Periods and the deadline drive planned progress and delay warnings.")}</DialogDescription>
        </DialogHeader>
        <form id="chapter-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 overflow-y-auto" noValidate>
          <FormField label={t("Title")} htmlFor="ch-title" required error={errors.title?.message}>
            <Input id="ch-title" {...register("title")} aria-invalid={errors.title ? true : undefined} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={t("Code")} htmlFor="ch-code" optional error={errors.code?.message}>
              <Input id="ch-code" {...register("code")} />
            </FormField>
            <FormField label={t("Periods")} htmlFor="ch-periods" required error={errors.plannedPeriods?.message}>
              <Input id="ch-periods" inputMode="numeric" {...register("plannedPeriods")} aria-invalid={errors.plannedPeriods ? true : undefined} />
            </FormField>
            <FormField label={t("Weight")} htmlFor="ch-weight" required error={errors.weight?.message} hint={t("1 = normal")}>
              <Input id="ch-weight" inputMode="decimal" {...register("weight")} aria-invalid={errors.weight ? true : undefined} />
            </FormField>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("Starts")} htmlFor="ch-start" optional error={errors.startDate?.message} hint={t("Defaults to the previous chapter's deadline.")}>
              <Input id="ch-start" type="date" {...register("startDate")} />
            </FormField>
            <FormField label={t("Complete by")} htmlFor="ch-end" optional error={errors.deadline?.message} hint={deadlineHint ? t("Syllabus ends {{v1}}.", { v1: formatDate(deadlineHint) }) : undefined}>
              <Input id="ch-end" type="date" {...register("deadline")} aria-invalid={errors.deadline ? true : undefined} />
            </FormField>
          </div>
          <FormField label={t("Learning objectives")} htmlFor="ch-obj" optional error={errors.learningObjectives?.message}>
            <Textarea id="ch-obj" rows={3} {...register("learningObjectives")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => guardedClose(isDirty, save.isPending, onOpenChange)(false)}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form="chapter-form" loading={save.isPending}>
            {editing ? t("Save changes") : t("Add chapter")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Topic dialog ────────────────────────────────────────────────────────────

const topicSchema = z.object({
  title: z.string().trim().min(1, "Give the topic a title").max(200),
  plannedPeriods: z.coerce.number({ message: "Enter a number" }).int().min(0, "At least 0").max(1000, "At most 1000"),
  weight: z.coerce.number({ message: "Enter a number" }).gt(0, "Above 0").max(100, "At most 100"),
  learningObjectives: z.string().max(4000).optional(),
});
type TopicForm = z.input<typeof topicSchema>;

function TopicDialog({ target, onClose, invalidate }: { target: { chapter: Chapter; editing: Topic | null; parent?: Topic } | null; onClose: () => void; invalidate: string[][] }) {
  const { t } = useTranslation("lesson-portions");
  const { register, handleSubmit, reset, formState } = useForm<TopicForm, unknown, z.output<typeof topicSchema>>({ resolver: zodResolver(topicSchema) });
  const { errors, isDirty } = formState;
  const editing = target?.editing ?? null;
  useEffect(() => {
    if (target) reset(editing ? { title: editing.title, plannedPeriods: editing.plannedPeriods, weight: editing.weight, learningObjectives: editing.learningObjectives ?? "" } : { title: "", plannedPeriods: 1, weight: 1, learningObjectives: "" });
  }, [target, editing, reset]);
  const save = useApiMutation(
    (v: z.output<typeof topicSchema>) =>
      editing
        ? updateTopic(editing.id, { ...v, parentTopicId: editing.parentTopicId, rowVersion: editing.rowVersion })
        : addTopic(target!.chapter.id, { ...v, parentTopicId: target?.parent?.id ?? null }),
    { success: editing ? "Topic updated" : target?.parent ? "Subtopic added" : "Topic added", invalidate, onSuccess: onClose },
  );
  const close = guardedClose(isDirty, save.isPending, (open) => !open && onClose());
  return (
    <Dialog open={Boolean(target)} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? t("Edit topic") : target?.parent ? t("Add a subtopic to {{title}}", { title: target.parent.title }) : t("Add a topic to {{v1}}", { v1: target?.chapter.title ?? "" })}</DialogTitle>
          <DialogDescription>{t("Teaching progress is recorded on topics (or on subtopics where a topic has them).")}</DialogDescription>
        </DialogHeader>
        <form id="topic-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
          <FormField label={t("Title")} htmlFor="tp-title" required error={errors.title?.message}>
            <Input id="tp-title" {...register("title")} aria-invalid={errors.title ? true : undefined} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label={t("Periods")} htmlFor="tp-periods" required error={errors.plannedPeriods?.message}>
              <Input id="tp-periods" inputMode="numeric" {...register("plannedPeriods")} aria-invalid={errors.plannedPeriods ? true : undefined} />
            </FormField>
            <FormField label={t("Weight")} htmlFor="tp-weight" required error={errors.weight?.message} hint={t("1 = normal")}>
              <Input id="tp-weight" inputMode="decimal" {...register("weight")} aria-invalid={errors.weight ? true : undefined} />
            </FormField>
          </div>
          <FormField label={t("Learning objectives")} htmlFor="tp-obj" optional error={errors.learningObjectives?.message}>
            <Textarea id="tp-obj" rows={3} {...register("learningObjectives")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form="topic-form" loading={save.isPending}>
            {editing ? t("Save changes") : t("Add")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── CSV import ──────────────────────────────────────────────────────────────

const IMPORT_COLUMNS = [
  { key: "chapter", label: "Chapter" },
  { key: "topic", label: "Topic" },
  { key: "subtopic", label: "Subtopic" },
  { key: "periods", label: "Periods" },
  { key: "deadline", label: "Deadline" },
  { key: "objectives", label: "Objectives" },
];

function ImportDialog({ open, onOpenChange, detail, invalidate }: { open: boolean; onOpenChange: (o: boolean) => void; detail: SyllabusDetail; invalidate: string[][] }) {
  const { t } = useTranslation("lesson-portions");
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [problems, setProblems] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState<string | null>(null);
  const [replace, setReplace] = useState(false);
  const [result, setResult] = useState<{ chapters: number; topics: number; warnings: string[] } | null>(null);

  const reset = () => {
    setRows([]);
    setProblems([]);
    setFileName("");
    setFileError(null);
    setReplace(false);
    setResult(null);
    if (input.current) input.current.value = "";
  };

  const run = useApiMutation(() => importSyllabus(detail.summary.id, rows, replace), {
    invalidate,
    onSuccess: (r) => setResult({ chapters: r.chaptersCreated, topics: r.topicsCreated, warnings: r.warnings }),
  });

  const onFile = async (file?: File) => {
    setRows([]);
    setProblems([]);
    setFileError(null);
    setResult(null);
    if (!file) return;
    setFileName(file.name);
    const { records, missing } = rowsToRecords(parseCsv(await file.text()), IMPORT_COLUMNS);
    if (missing.includes("Chapter")) return setFileError("The file needs a Chapter column. Download the template for the right headings.");
    if (records.length === 0) return setFileError("The file has no data rows.");
    if (records.length > 5000) return setFileError("Import up to 5000 rows at a time.");
    const parsed: ImportRow[] = [];
    const bad: string[] = [];
    records.forEach((r, i) => {
      const line = i + 2;
      if (!r.chapter && !r.topic && !r.subtopic) return;
      const periods = r.periods ? Number(r.periods) : undefined;
      if (periods !== undefined && (!Number.isInteger(periods) || periods < 0 || periods > 1000)) return void bad.push(`Row ${line}: periods must be a whole number from 0 to 1000.`);
      const deadline = r.deadline ? normalizeDate(r.deadline) : undefined;
      if (r.deadline && !deadline) return void bad.push(`Row ${line}: "${r.deadline}" is not a valid date (use yyyy-mm-dd or dd/mm/yyyy).`);
      parsed.push({ chapter: r.chapter, topic: r.topic || undefined, subtopic: r.subtopic || undefined, periods, deadline: deadline ?? undefined, objectives: r.objectives || undefined });
    });
    setRows(parsed);
    setProblems(bad);
  };

  const template = () =>
    downloadCsv("syllabus-import-template", IMPORT_COLUMNS.map((c) => c.label), [
      ["Real numbers", "Place value", "", 3, "2026-07-15", "Read and write numbers up to 10 crore"],
      ["Real numbers", "Rounding off", "Nearest 10, 100, 1000", 2, "", ""],
      ["Fractions", "Proper fractions", "", 4, "2026-08-30", ""],
    ]);

  const close = (o: boolean) => {
    if (run.isPending) return;
    if (!o) reset();
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{t("Import chapters and topics")}</DialogTitle>
          <DialogDescription>
            {t("Upload a CSV (in Excel, use Save As → CSV UTF-8). A row with a Chapter starts or continues that chapter; Topic and Subtopic fill in below it. Everything is imported together, or nothing is.")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto">
          {result ? (
            <div className="space-y-2">
              <p role="status" className="rounded-lg bg-secondary/50 px-3 py-2 text-sm">
                {t("Added")} {result.chapters} {t("chapter")}{result.chapters === 1 ? "" : "s"} {t("and")} {result.topics} {t("topic")}{result.topics === 1 ? "" : "s"}.
              </p>
              {result.warnings.length > 0 && (
                <ul className="max-h-40 space-y-1 overflow-auto rounded-lg border border-border p-2 text-sm">
                  {result.warnings.map((w) => (
                    <li key={w} className="text-warning-strong">
                      {w}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" variant="outline" onClick={template}>
                  <Download className="h-4 w-4" /> {t("Download template")}
                </Button>
                <Button type="button" size="sm" onClick={() => input.current?.click()}>
                  <FileUp className="h-4 w-4" /> {fileName ? t("Choose another file") : t("Choose CSV file")}
                </Button>
                <input ref={input} type="file" accept=".csv,text/csv" className="sr-only" aria-label={t("CSV file")} onChange={(e) => void onFile(e.target.files?.[0])} />
                {fileName && <span className="truncate text-sm text-muted-foreground">{fileName}</span>}
              </div>
              <p className="text-xs text-muted-foreground">{t("Columns: Chapter*, Topic, Subtopic, Periods, Deadline (yyyy-mm-dd or dd/mm/yyyy), Objectives.")}</p>
              {fileError && (
                <p role="alert" className="text-sm text-destructive-strong">
                  {fileError}
                </p>
              )}
              {problems.length > 0 && (
                <ul className="max-h-32 space-y-1 overflow-auto rounded-lg border border-destructive/30 p-2 text-sm text-destructive-strong">
                  {problems.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              )}
              {rows.length > 0 && problems.length === 0 && (
                <p role="status" className="text-sm">
                  <Badge variant="success">{t("{{length}} rows ready", { length: rows.length })}</Badge> {t("covering")} {new Set(rows.map((r) => r.chapter).filter(Boolean)).size} {t("chapters.")}
                </p>
              )}
              {detail.chapters.length > 0 && (
                <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                  <span>
                    {t("Replace the existing")} {detail.chapters.length} {t("chapters")}
                    <span className="block text-xs text-muted-foreground">{t("Off: the imported chapters are added after the existing ones. Replacing is refused once teaching has been recorded.")}</span>
                  </span>
                  <Switch checked={replace} onCheckedChange={setReplace} aria-label={t("Replace existing chapters")} />
                </label>
              )}
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => close(false)} disabled={run.isPending}>
            {result ? t("Close") : t("Cancel")}
          </Button>
          {!result && (
            <Button onClick={() => run.mutate(undefined)} disabled={rows.length === 0 || problems.length > 0} loading={run.isPending}>
              {t("Import")} {rows.length > 0 ? t("{{length}} rows", { length: rows.length }) : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
