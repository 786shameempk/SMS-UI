import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { BookCheck, CheckCheck, ChevronDown, ChevronRight, ClipboardEdit, History, ShieldAlert } from "lucide-react";
import { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { bulkProgress, correctProgress, myTeachingClasses, pendingUpdates, progressHistory, sectionSyllabus, updateProgress } from "../api";
import { Panel } from "../components/bits";
import { CHAPTER_STATUS, PROGRESS_STATUS, ProgressBar, RiskBadge, SelectField, StatusBadge, formatDate, formatDateTime, formatDay, guardedClose, options, pct, todayIso, useApiMutation, usePortionAccess } from "../shared";
import type { ProgressChapter, ProgressStatus, ProgressTopic, SectionSyllabus, TeachingClass } from "../types";

import { useTranslation } from "react-i18next";
export default function ProgressPage() {
  const [params, setParams] = useSearchParams();
  const planId = params.get("plan");
  const sectionId = params.get("section");
  return planId && sectionId ? (
    <SectionView planId={planId} sectionId={sectionId} onBack={() => setParams({})} />
  ) : (
    <ClassList onOpen={(c) => setParams({ plan: c.syllabusPlanId, section: c.sectionId })} />
  );
}

function ClassList({ onOpen }: { onOpen: (c: TeachingClass) => void }) {
  const { t } = useTranslation("lesson-portions");
  const classes = useQuery({ queryKey: ["portions", "my-classes"], queryFn: myTeachingClasses });
  const pending = useQuery({ queryKey: ["portions", "pending-updates"], queryFn: () => pendingUpdates() });
  const list = classes.data ?? [];

  return (
    <div className="space-y-5">
      {pending.data && pending.data.length > 0 && (
        <Panel title={t("Lessons waiting for an update")} description={t("Planned for a past date, nothing recorded yet.")}>
          <ul className="divide-y divide-border">
            {pending.data.slice(0, 6).map((p) => (
              <li key={`${p.lessonPlanId}-${p.syllabusTopicId}-${p.sectionId}`} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{p.topicTitle}</p>
                  <p className="text-xs text-muted-foreground">{t("{{subjectName}} · {{className}} {{sectionName}} · planned {{v1}}", { subjectName: p.subjectName, className: p.className, sectionName: p.sectionName, v1: formatDay(p.plannedDate) })}</p>
                </div>
                <Badge variant={p.daysLate > 3 ? "danger" : "warning"}>{t("{{daysLate}}d late", { daysLate: p.daysLate })}</Badge>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {classes.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      ) : classes.isError ? (
        <ErrorState onRetry={() => classes.refetch()} retrying={classes.isFetching} />
      ) : list.length === 0 ? (
        <EmptyState icon={BookCheck} title={t("No classes to update yet")} description={t("Your classes and subjects appear here once the school publishes a syllabus for them and the timetable or your assignments name you.")} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((c) => (
            <Card key={`${c.syllabusPlanId}-${c.sectionId}`} className="transition-shadow hover:shadow-md">
              <CardContent className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{c.subjectName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.className} {c.sectionName}
                    </p>
                  </div>
                  <RiskBadge risk={c.risk} />
                </div>
                <ProgressBar percent={c.percent} planned={c.plannedPercent} risk={c.risk} />
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>{c.lastUpdatedOn ? t("Last taught {{v1}}", { v1: formatDate(c.lastUpdatedOn) }) : t("Nothing recorded yet")}</span>
                  {c.pendingUpdates > 0 && <Badge variant="warning">{t("{{pendingUpdates}} to record", { pendingUpdates: c.pendingUpdates })}</Badge>}
                </div>
                <Button className="w-full" variant="outline" onClick={() => onOpen(c)}>
                  {t("Open syllabus")}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionView({ planId, sectionId, onBack }: { planId: string; sectionId: string; onBack: () => void }) {
  const { t: tr } = useTranslation("lesson-portions");
  const access = usePortionAccess();
  const query = useQuery({ queryKey: ["portions", "section-syllabus", planId, sectionId], queryFn: () => sectionSyllabus(planId, sectionId) });
  const [record, setRecord] = useState<ProgressTopic | null>(null);
  const [correct, setCorrect] = useState<ProgressTopic | null>(null);
  const [history, setHistory] = useState<ProgressTopic | null>(null);
  const [bulk, setBulk] = useState<ProgressChapter | null>(null);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  if (query.isLoading) return <Skeleton className="h-64 w-full" />;
  if (query.isError || !query.data) return <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />;
  const d = query.data;
  const c = d.completion;
  // Chapters under way start open, and so does the first one still to teach, so the next topic to record is never hidden behind a click.
  const firstToTeach = d.chapters.find((ch) => ch.status !== "Completed")?.chapterId;
  const expanded = (ch: ProgressChapter) => open[ch.chapterId] ?? (ch.status === "InProgress" || ch.status === "Delayed" || ch.chapterId === firstToTeach);

  return (
    <div className="space-y-5">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ms-2">
        {tr("← My classes")}
      </Button>
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h2 className="truncate text-lg font-semibold">
                {d.subjectName} · {d.className} {d.sectionName}
              </h2>
              <p className="text-sm text-muted-foreground">{d.syllabusTitle}</p>
            </div>
            {!d.canUpdate && <Badge variant="neutral">{tr("View only")}</Badge>}
          </div>
          <ProgressBar percent={c.percent} planned={d.plannedPercent} label={tr("Syllabus completion {{v1}}", { v1: pct(c.percent) })} />
          <p className="text-xs text-muted-foreground">{tr("{{completedChapters}} of {{totalChapters}} chapters complete · {{inProgressChapters}} in progress · {{pendingChapters}} not started · {{completedTopics}} of {{totalTopics}} topics taught · the tick shows where the plan says you should be.", { completedChapters: c.completedChapters, totalChapters: c.totalChapters, inProgressChapters: c.inProgressChapters, pendingChapters: c.pendingChapters, completedTopics: c.completedTopics, totalTopics: c.totalTopics })}</p>
        </CardContent>
      </Card>

      <ul className="space-y-3">
        {d.chapters.map((ch) => (
          <li key={ch.chapterId}>
            <Card>
              <CardContent className="space-y-2 p-0">
                <div className="flex flex-wrap items-center gap-2 px-4 py-3">
                  <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-start" aria-expanded={expanded(ch)} onClick={() => setOpen({ ...open, [ch.chapterId]: !expanded(ch) })}>
                    {expanded(ch) ? <ChevronDown className="h-4 w-4 shrink-0" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 shrink-0" aria-hidden="true" />}
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{ch.title}</span>
                      <span className="block text-xs text-muted-foreground">{ch.deadline ? tr("Due {{v1}}", { v1: formatDate(ch.deadline) }) : tr("No deadline")} · {pct(ch.percent)} {tr("taught")}</span>
                    </span>
                  </button>
                  {ch.overdue && <Badge variant="danger">{tr("Overdue")}</Badge>}
                  <StatusBadge map={CHAPTER_STATUS} value={ch.status} />
                  {d.canUpdate && ch.status !== "Completed" && (
                    <Button size="sm" variant="outline" onClick={() => setBulk(ch)}>
                      <CheckCheck className="h-4 w-4" /> {tr("Mark chapter taught")}
                    </Button>
                  )}
                </div>
                {expanded(ch) && (
                  <ul className="divide-y divide-border border-t border-border">
                    {ch.topics.map((t) => (
                      <li key={t.topicId} className="flex flex-wrap items-center gap-2 px-4 py-2.5 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{t.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {t.plannedPeriods} {tr("planned")}
                            {t.plannedDate ? tr(" · planned {{v1}}", { v1: formatDay(t.plannedDate) }) : ""}
                            {t.taughtOn ? tr(" · taught {{v1}} · {{periodsUsed}} period{{v2}}", { v1: formatDate(t.taughtOn), periodsUsed: t.periodsUsed, v2: t.periodsUsed === 1 ? "" : "s" }) : ""}
                          </p>
                          {t.status === "Delayed" && t.delayReason && <p className="text-xs text-destructive-strong">{tr("Delayed: {{delayReason}}", { delayReason: t.delayReason })}</p>}
                          {t.homework && <p className="text-xs text-muted-foreground">{tr("Homework: {{homework}}", { homework: t.homework })}</p>}
                        </div>
                        <StatusBadge map={PROGRESS_STATUS} value={t.status} />
                        <div className="flex items-center gap-1">
                          {d.canUpdate && t.status !== "Completed" && (
                            <Button size="sm" variant={t.status === "NotStarted" ? "default" : "outline"} onClick={() => setRecord(t)}>
                              <ClipboardEdit className="h-4 w-4" /> {t.status === "NotStarted" ? tr("Record") : tr("Update")}
                            </Button>
                          )}
                          {t.progressId && (
                            <Button size="icon-sm" variant="ghost" aria-label={tr("History of {{title}}", { title: t.title })} onClick={() => setHistory(t)}>
                              <History className="h-4 w-4" />
                            </Button>
                          )}
                          {t.progressId && access.canApprove && (
                            <Button size="icon-sm" variant="ghost" aria-label={tr("Correct {{title}}", { title: t.title })} onClick={() => setCorrect(t)}>
                              <ShieldAlert className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </li>
        ))}
      </ul>

      <RecordDialog topic={record} sectionId={sectionId} onClose={() => setRecord(null)} keys={[planId, sectionId]} />
      <CorrectionDialog topic={correct} onClose={() => setCorrect(null)} keys={[planId, sectionId]} />
      <HistoryDialog topic={history} onClose={() => setHistory(null)} />
      <BulkDialog chapter={bulk} sectionId={sectionId} data={d} onClose={() => setBulk(null)} keys={[planId, sectionId]} />
    </div>
  );
}

const refresh = (keys: string[]) => [["portions", "section-syllabus", keys[0], keys[1]], ["portions", "my-classes"], ["portions", "pending-updates"], ["portions", "dashboard"]];

// ── Record teaching ─────────────────────────────────────────────────────────

const recordSchema = z
  .object({
    status: z.enum(["InProgress", "Completed", "Delayed"]),
    taughtOn: z.string().min(1, "Give the date it was taught"),
    periodsUsed: z.coerce.number({ message: "Enter a number" }).int("Whole periods only").min(0, "At least 0").max(100, "At most 100"),
    notes: z.string().max(4000).optional(),
    homework: z.string().max(2000).optional(),
    observations: z.string().max(2000).optional(),
    delayReason: z.string().max(1000).optional(),
    nextLessonDate: z.string().optional(),
  })
  .refine((v) => v.taughtOn <= todayIso(), { path: ["taughtOn"], message: "The date can't be in the future" })
  .refine((v) => v.status !== "Delayed" || Boolean(v.delayReason?.trim()), { path: ["delayReason"], message: "Say why the portion is delayed" })
  .refine((v) => !v.nextLessonDate || v.nextLessonDate >= v.taughtOn, { path: ["nextLessonDate"], message: "The next lesson can't be before this one" });
type RecordForm = z.input<typeof recordSchema>;

function RecordDialog({ topic, sectionId, onClose, keys }: { topic: ProgressTopic | null; sectionId: string; onClose: () => void; keys: string[] }) {
  const { t } = useTranslation("lesson-portions");
  const { register, handleSubmit, control, reset, watch, formState } = useForm<RecordForm, unknown, z.output<typeof recordSchema>>({ resolver: zodResolver(recordSchema) });
  const { errors, isDirty } = formState;
  useEffect(() => {
    if (!topic) return;
    reset({
      status: topic.status === "NotStarted" ? "InProgress" : (topic.status as "InProgress" | "Completed" | "Delayed"),
      taughtOn: topic.taughtOn ?? todayIso(),
      periodsUsed: topic.periodsUsed || 1,
      notes: topic.notes ?? "",
      homework: topic.homework ?? "",
      observations: topic.observations ?? "",
      delayReason: topic.delayReason ?? "",
      nextLessonDate: topic.nextLessonDate ?? "",
    });
  }, [topic, reset]);
  const save = useApiMutation(
    (v: z.output<typeof recordSchema>) => updateProgress({ ...v, sectionId, syllabusTopicId: topic!.topicId, nextLessonDate: v.nextLessonDate || null, rowVersion: topic!.rowVersion }),
    { success: "Teaching recorded", invalidate: refresh(keys), onSuccess: onClose },
  );
  const status = watch("status");
  const close = guardedClose(isDirty, save.isPending, (open) => !open && onClose());

  return (
    <Dialog open={Boolean(topic)} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{topic?.title}</DialogTitle>
          <DialogDescription>{t("Record what was taught. Your notes and observations stay inside the school; parents and students never see them.")}</DialogDescription>
        </DialogHeader>
        <form id="record-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4 overflow-y-auto" noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={t("Status")} htmlFor="rc-status" required error={errors.status?.message}>
              <Controller control={control} name="status" render={({ field }) => <SelectField id="rc-status" value={field.value} onChange={(v) => field.onChange(v ?? "InProgress")} items={options({ InProgress: "In progress", Completed: "Completed", Delayed: "Delayed" })} className="w-full" />} />
            </FormField>
            <FormField label={t("Date taught")} htmlFor="rc-date" required error={errors.taughtOn?.message}>
              <Input id="rc-date" type="date" max={todayIso()} {...register("taughtOn")} aria-invalid={errors.taughtOn ? true : undefined} />
            </FormField>
            <FormField label={t("Periods used")} htmlFor="rc-periods" required error={errors.periodsUsed?.message}>
              <Input id="rc-periods" inputMode="numeric" {...register("periodsUsed")} aria-invalid={errors.periodsUsed ? true : undefined} />
            </FormField>
          </div>
          {status === "Delayed" && (
            <FormField label={t("Reason for the delay")} htmlFor="rc-delay" required error={errors.delayReason?.message}>
              <Textarea id="rc-delay" rows={2} {...register("delayReason")} aria-invalid={errors.delayReason ? true : undefined} />
            </FormField>
          )}
          <FormField label={t("Teaching notes")} htmlFor="rc-notes" optional hint={t("Internal.")} error={errors.notes?.message}>
            <Textarea id="rc-notes" rows={3} {...register("notes")} />
          </FormField>
          <FormField label={t("Homework or assignment")} htmlFor="rc-hw" optional hint={t("Parents and students can see this if the school allows it.")} error={errors.homework?.message}>
            <Textarea id="rc-hw" rows={2} {...register("homework")} />
          </FormField>
          <FormField label={t("Classroom observations")} htmlFor="rc-obs" optional hint={t("Internal.")} error={errors.observations?.message}>
            <Textarea id="rc-obs" rows={2} {...register("observations")} />
          </FormField>
          <FormField label={t("Next lesson on")} htmlFor="rc-next" optional error={errors.nextLessonDate?.message}>
            <Input id="rc-next" type="date" {...register("nextLessonDate")} aria-invalid={errors.nextLessonDate ? true : undefined} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form="record-form" loading={save.isPending}>
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Correction (coordinators) ───────────────────────────────────────────────

const correctionSchema = z.object({
  status: z.enum(["NotStarted", "InProgress", "Completed", "Delayed"]),
  taughtOn: z.string().optional(),
  periodsUsed: z.coerce.number({ message: "Enter a number" }).int().min(0).max(100),
  reason: z.string().trim().min(1, "Give the reason for the correction").max(1000),
});
type CorrectionForm = z.input<typeof correctionSchema>;

function CorrectionDialog({ topic, onClose, keys }: { topic: ProgressTopic | null; onClose: () => void; keys: string[] }) {
  const { t } = useTranslation("lesson-portions");
  const { register, handleSubmit, control, reset, formState } = useForm<CorrectionForm, unknown, z.output<typeof correctionSchema>>({ resolver: zodResolver(correctionSchema) });
  const { errors, isDirty } = formState;
  useEffect(() => {
    if (topic) reset({ status: topic.status, taughtOn: topic.taughtOn ?? "", periodsUsed: topic.periodsUsed, reason: "" });
  }, [topic, reset]);
  const save = useApiMutation((v: z.output<typeof correctionSchema>) => correctProgress(topic!.progressId!, { ...v, taughtOn: v.taughtOn || null, rowVersion: topic!.rowVersion }), {
    success: "Correction recorded",
    invalidate: refresh(keys),
    onSuccess: onClose,
  });
  const close = guardedClose(isDirty, save.isPending, (open) => !open && onClose());
  return (
    <Dialog open={Boolean(topic)} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("Correct teaching record")}</DialogTitle>
          <DialogDescription>{topic?.title}{t(". The earlier state stays in the history with your reason.")}</DialogDescription>
        </DialogHeader>
        <form id="correct-form" onSubmit={handleSubmit((v) => save.mutate(v))} className="space-y-4" noValidate>
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label={t("Status")} htmlFor="co-status" required>
              <Controller control={control} name="status" render={({ field }) => <SelectField id="co-status" value={field.value} onChange={(v) => field.onChange(v ?? "InProgress")} items={options({ NotStarted: "Not started", InProgress: "In progress", Completed: "Completed", Delayed: "Delayed" })} className="w-full" />} />
            </FormField>
            <FormField label={t("Date taught")} htmlFor="co-date" error={errors.taughtOn?.message}>
              <Input id="co-date" type="date" max={todayIso()} {...register("taughtOn")} />
            </FormField>
            <FormField label={t("Periods")} htmlFor="co-periods" error={errors.periodsUsed?.message}>
              <Input id="co-periods" inputMode="numeric" {...register("periodsUsed")} />
            </FormField>
          </div>
          <FormField label={t("Reason")} htmlFor="co-reason" required error={errors.reason?.message}>
            <Textarea id="co-reason" rows={3} {...register("reason")} aria-invalid={errors.reason ? true : undefined} />
          </FormField>
        </form>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {t("Cancel")}
          </Button>
          <Button type="submit" form="correct-form" loading={save.isPending}>
            {t("Record correction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── History ─────────────────────────────────────────────────────────────────

function HistoryDialog({ topic, onClose }: { topic: ProgressTopic | null; onClose: () => void }) {
  const { t } = useTranslation("lesson-portions");
  const query = useQuery({ queryKey: ["portions", "progress-history", topic?.progressId], queryFn: () => progressHistory(topic!.progressId!), enabled: Boolean(topic?.progressId) });
  return (
    <Dialog open={Boolean(topic)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t("History")}</DialogTitle>
          <DialogDescription>{topic?.title}{t(". Every change is kept; corrections are marked.")}</DialogDescription>
        </DialogHeader>
        <div className="overflow-y-auto">
          {query.isLoading && <Skeleton className="h-24 w-full" />}
          {query.isError && <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />}
          <ol className="space-y-3">
            {query.data?.map((h) => (
              <li key={h.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  {h.fromStatus && <StatusBadge map={PROGRESS_STATUS} value={h.fromStatus} />}
                  {h.fromStatus && <span aria-hidden="true">→</span>}
                  <StatusBadge map={PROGRESS_STATUS} value={h.toStatus} />
                  {h.isCorrection && <Badge variant="warning">{t("Correction")}</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDateTime(h.changedAt)}
                  {h.taughtOn ? t(" · taught {{v1}}", { v1: formatDate(h.taughtOn) }) : ""} · {h.periodsUsed} {t("period")}{h.periodsUsed === 1 ? "" : "s"}
                </p>
                {h.reason && <p className="mt-1 text-xs">{h.reason}</p>}
              </li>
            ))}
          </ol>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Mark a chapter taught ───────────────────────────────────────────────────

function BulkDialog({ chapter, sectionId, data, onClose, keys }: { chapter: ProgressChapter | null; sectionId: string; data: SectionSyllabus; onClose: () => void; keys: string[] }) {
  const { t: tr } = useTranslation("lesson-portions");
  const [date, setDate] = useState(todayIso());
  const [status, setStatus] = useState<ProgressStatus>("Completed");
  const topics = chapter?.topics.filter((t) => t.status !== "Completed") ?? [];
  useEffect(() => {
    if (chapter) {
      setDate(todayIso());
      setStatus("Completed");
    }
  }, [chapter]);
  const save = useApiMutation(() => bulkProgress({ sectionId, topicIds: topics.map((t) => t.topicId), status, taughtOn: date, periodsUsed: 1 }), {
    success: (r) => `${r.updated} topic${r.updated === 1 ? "" : "s"} updated`,
    invalidate: refresh(keys),
    onSuccess: onClose,
  });
  const invalid = !date || date > todayIso();
  return (
    <Dialog open={Boolean(chapter)} onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{tr("Mark the chapter taught")}</DialogTitle>
          <DialogDescription>
            {tr("Updates the {{count}} topics of \"{{chapter}}\" that aren't completed yet in {{section}}, using 1 period each. Topics already completed are left as they are.", { count: topics.length, chapter: chapter?.title, section: `${data.className} ${data.sectionName}` })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label={tr("Mark them as")} htmlFor="bk-status">
            <SelectField id="bk-status" value={status} onChange={(v) => setStatus(v ?? "Completed")} items={options({ InProgress: "In progress", Completed: "Completed" })} className="w-full" />
          </FormField>
          <FormField label={tr("Date taught")} htmlFor="bk-date" required error={date > todayIso() ? "The date can't be in the future" : undefined}>
            <Input id="bk-date" type="date" max={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            {tr("Cancel")}
          </Button>
          <Button onClick={() => save.mutate(undefined)} disabled={invalid || topics.length === 0} loading={save.isPending}>
            {tr("Update")} {topics.length} {tr("topic")}{topics.length === 1 ? "" : "s"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
