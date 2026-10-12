import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { CalendarClock, ClipboardList, History, Pencil, Plus, Send, Sparkles, Trash2 } from "lucide-react";
import { z } from "zod";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { DataTable } from "@/components/tables/DataTable";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { RowActions } from "@/components/ui/row-actions";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { generateLessonPlan } from "@/features/ai/generation/api";
import { lessonPlanToText } from "@/features/ai/generation/assignment";
import { createLessonPlan, deleteLessonPlan, getLessonPlan, getSyllabus, lessonPlanHistory, listLessonPlans, listSyllabi, planCapacity, rescheduleLessonPlan, submitLessonPlan, updateLessonPlan } from "../api";
import { APPROVAL, PLAN_TYPE_LABEL, SelectField, StatusBadge, addDays, formatDate, formatDateTime, guardedClose, options, todayIso, useApiMutation, usePortionAccess, useReferenceData } from "../shared";
import type { Chapter, LessonPlan, LessonPlanTopicInput, SyllabusDetail } from "../types";

export default function MyPlanPage() {
  const access = usePortionAccess();
  const data = useReferenceData({ teachers: access.canApprove || access.canManage });
  const [filters, setFilters] = useState<{ status?: LessonPlan["approvalStatus"]; classId?: string; subjectId?: string }>({});
  const list = useQuery({ queryKey: ["portions", "lesson-plans", filters], queryFn: () => listLessonPlans({ ...filters, pageSize: 200 }), placeholderData: (p) => p });
  const [form, setForm] = useState<{ open: boolean; editing: LessonPlan | null }>({ open: false, editing: null });
  const [detail, setDetail] = useState<LessonPlan | null>(null);
  const [reschedule, setReschedule] = useState<LessonPlan | null>(null);
  const [submit, setSubmit] = useState<LessonPlan | null>(null);
  const [remove, setRemove] = useState<LessonPlan | null>(null);

  const del = useApiMutation(deleteLessonPlan, { success: "Lesson plan deleted", onSuccess: () => setRemove(null) });

  const columns: ColumnDef<LessonPlan, unknown>[] = [
    {
      id: "title",
      header: "Plan",
      accessorFn: (r) => `${r.title} ${r.subjectName} ${r.className}`,
      cell: ({ row }) => (
        <button type="button" className="text-left" onClick={() => setDetail(row.original)}>
          <p className="text-sm font-medium hover:underline">
            {row.original.title}
            {row.original.isAiGenerated && <Sparkles className="ml-1 inline h-3.5 w-3.5 text-primary" aria-label="Drafted with AI" />}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.subjectName} · {row.original.className}
            {row.original.sectionName ? ` ${row.original.sectionName}` : ""}
            {row.original.teacherName && access.seesAll ? ` · ${row.original.teacherName}` : ""}
          </p>
        </button>
      ),
    },
    { id: "type", header: "Type", accessorFn: (r) => PLAN_TYPE_LABEL[r.planType], cell: ({ row }) => <span className="text-sm">{PLAN_TYPE_LABEL[row.original.planType]}</span> },
    {
      id: "dates",
      header: "Dates",
      accessorFn: (r) => r.plannedStartDate ?? "",
      cell: ({ row }) => (
        <span className="text-sm">
          {formatDate(row.original.plannedStartDate)} – {formatDate(row.original.plannedEndDate)}
        </span>
      ),
    },
    { id: "periods", header: "Periods", accessorFn: (r) => r.allocatedPeriods, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.allocatedPeriods}</span> },
    { id: "topics", header: "Topics", accessorFn: (r) => r.topicCount, cell: ({ row }) => <span className="text-sm tabular-nums">{row.original.topicCount}</span> },
    {
      id: "status",
      header: "Status",
      accessorFn: (r) => r.approvalStatus,
      cell: ({ row }) => (
        <div className="flex items-center gap-1.5">
          <StatusBadge map={APPROVAL} value={row.original.approvalStatus} />
          {row.original.revision > 1 && <span className="text-xs text-muted-foreground">rev {row.original.revision}</span>}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => {
        const p = row.original;
        const canEdit = access.canPlan || access.canApprove;
        return (
          <RowActions label={`Actions for ${p.title}`}>
            <DropdownMenuItem onClick={() => setDetail(p)}>
              <History /> Details and history
            </DropdownMenuItem>
            {canEdit && (
              <DropdownMenuItem onClick={() => setForm({ open: true, editing: p })}>
                <Pencil /> {p.approvalStatus === "Approved" ? "Revise" : "Edit"}
              </DropdownMenuItem>
            )}
            {canEdit && p.syllabusPlanId && p.approvalStatus === "Approved" && (
              <DropdownMenuItem onClick={() => setReschedule(p)}>
                <CalendarClock /> Reschedule lessons
              </DropdownMenuItem>
            )}
            {canEdit && (p.approvalStatus === "Draft" || p.approvalStatus === "Rejected" || p.approvalStatus === "RevisionRequested") && (
              <DropdownMenuItem onClick={() => setSubmit(p)}>
                <Send /> Submit for approval
              </DropdownMenuItem>
            )}
            {canEdit && p.approvalStatus !== "Approved" && p.approvalStatus !== "Submitted" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem variant="destructive" onClick={() => setRemove(p)}>
                  <Trash2 /> Delete
                </DropdownMenuItem>
              </>
            )}
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTable
        searchable
        searchPlaceholder="Search plans…"
        columns={columns}
        data={list.data?.items ?? []}
        isLoading={list.isLoading}
        isError={list.isError}
        onRetry={() => list.refetch()}
        exportFileName="lesson-plans"
        pageSize={10}
        empty={{ icon: ClipboardList, title: "No lesson plans yet", description: access.canPlan ? "Plan the topics you will teach, on which dates, then submit the plan." : "No lesson plans match these filters." }}
        filters={
          <>
            <SelectField aria-label="Status" value={filters.status} onChange={(v) => setFilters({ ...filters, status: v })} allLabel="Any status" items={options({ Draft: "Draft", Submitted: "Awaiting approval", Approved: "Approved", Rejected: "Rejected", RevisionRequested: "Changes requested" })} className="w-44" />
            <SelectField aria-label="Class" value={filters.classId} onChange={(v) => setFilters({ ...filters, classId: v })} allLabel="All classes" items={data.classes.map((c) => ({ value: c.id, label: c.name }))} className="w-36" />
            <SelectField aria-label="Subject" value={filters.subjectId} onChange={(v) => setFilters({ ...filters, subjectId: v })} allLabel="All subjects" items={data.subjects.map((c) => ({ value: c.id, label: c.name }))} className="w-40" />
          </>
        }
        actions={
          access.canPlan && (
            <Button onClick={() => setForm({ open: true, editing: null })}>
              <Plus className="h-4 w-4" /> New plan
            </Button>
          )
        }
      />

      <PlanFormDialog open={form.open} editing={form.editing} onOpenChange={(open) => setForm({ open, editing: open ? form.editing : null })} data={data} canAssign={access.canApprove || access.canManage} />
      <DetailDialog plan={detail} onClose={() => setDetail(null)} />
      <RescheduleDialog plan={reschedule} onClose={() => setReschedule(null)} />
      <SubmitDialog plan={submit} onClose={() => setSubmit(null)} />
      <ConfirmDialog
        open={Boolean(remove)}
        onOpenChange={(open) => !open && setRemove(null)}
        title="Delete this lesson plan?"
        description="The plan is removed. Teaching records are not affected."
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={del.isPending}
        onConfirm={() => { if (remove) del.mutate(remove.id); }}
      />
    </div>
  );
}

// ── Submit ──────────────────────────────────────────────────────────────────

function SubmitDialog({ plan, onClose }: { plan: LessonPlan | null; onClose: () => void }) {
  const [note, setNote] = useState("");
  useEffect(() => setNote(""), [plan]);
  const send = useApiMutation(() => submitLessonPlan(plan!.id, plan!.rowVersion, note.trim() || undefined), {
    success: (p) => (p.approvalStatus === "Approved" ? "Plan published" : "Submitted for approval"),
    onSuccess: onClose,
  });
  return (
    <Dialog open={Boolean(plan)} onOpenChange={(open) => !open && !send.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Submit "{plan?.title}"</DialogTitle>
          <DialogDescription>If your school requires approval, a coordinator reviews the plan before it is published. Otherwise it is published straight away.</DialogDescription>
        </DialogHeader>
        <FormField label="Note to the reviewer" htmlFor="sb-note" optional>
          <Textarea id="sb-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={1000} />
        </FormField>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={send.isPending}>
            Cancel
          </Button>
          <Button onClick={() => send.mutate(undefined)} loading={send.isPending}>
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Details & history ───────────────────────────────────────────────────────

function DetailDialog({ plan, onClose }: { plan: LessonPlan | null; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["portions", "lesson-plan", plan?.id], queryFn: () => getLessonPlan(plan!.id), enabled: Boolean(plan) });
  const audit = useQuery({ queryKey: ["portions", "lesson-plan-audit", plan?.id], queryFn: () => lessonPlanHistory(plan!.id), enabled: Boolean(plan) });
  const d = detail.data;
  return (
    <Dialog open={Boolean(plan)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{plan?.title}</DialogTitle>
          <DialogDescription>
            {plan?.subjectName} · {plan?.className} {plan?.sectionName ?? ""} · {formatDate(plan?.plannedStartDate)} – {formatDate(plan?.plannedEndDate)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5 overflow-y-auto">
          {detail.isLoading && <Skeleton className="h-32 w-full" />}
          {d && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge map={APPROVAL} value={d.approvalStatus} />
                <Badge variant="neutral">Revision {d.revision}</Badge>
                <Badge variant="neutral">{PLAN_TYPE_LABEL[d.planType]}</Badge>
                {d.isAiGenerated && <Badge variant="brand">Drafted with AI</Badge>}
              </div>
              {d.description && <p className="whitespace-pre-line text-sm leading-6">{d.description}</p>}
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Topics ({d.topics?.length ?? 0})</h3>
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {d.topics?.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1">
                        {t.topicTitle}
                        <span className="block text-xs text-muted-foreground">{t.chapterTitle}</span>
                      </span>
                      <span className="text-xs text-muted-foreground">{t.plannedDate ? formatDate(t.plannedDate) : "No date"} · {t.plannedPeriods}p</span>
                    </li>
                  ))}
                </ul>
              </section>
              <section className="space-y-2">
                <h3 className="text-sm font-semibold">Approval history</h3>
                {d.history && d.history.length > 0 ? (
                  <ol className="space-y-2">
                    {d.history.map((h) => (
                      <li key={h.id} className="rounded-lg border border-border p-2.5 text-sm">
                        <p className="font-medium">
                          {h.action === "RevisionRequested" ? "Changes requested" : h.action} <span className="text-xs font-normal text-muted-foreground">· revision {h.revision} · {formatDateTime(h.at)}</span>
                        </p>
                        {h.comment && <p className="text-xs text-muted-foreground">{h.comment}</p>}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="text-sm text-muted-foreground">Not submitted yet.</p>
                )}
              </section>
              {audit.data && audit.data.length > 0 && (
                <section className="space-y-2">
                  <h3 className="text-sm font-semibold">Change log</h3>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {audit.data.slice(0, 15).map((a) => (
                      <li key={a.id}>
                        {formatDateTime(a.at)} · {a.action.replace(/-/g, " ")}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Reschedule ──────────────────────────────────────────────────────────────

function RescheduleDialog({ plan, onClose }: { plan: LessonPlan | null; onClose: () => void }) {
  const detail = useQuery({ queryKey: ["portions", "lesson-plan", plan?.id], queryFn: () => getLessonPlan(plan!.id), enabled: Boolean(plan) });
  const [dates, setDates] = useState<Record<string, string>>({});
  const [reason, setReason] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  useEffect(() => {
    if (!plan) return;
    setReason("");
    setStart(plan.plannedStartDate ?? "");
    setEnd(plan.plannedEndDate ?? "");
  }, [plan]);
  useEffect(() => {
    if (detail.data?.topics) setDates(Object.fromEntries(detail.data.topics.map((t) => [t.syllabusTopicId, t.plannedDate ?? ""])));
  }, [detail.data]);

  const save = useApiMutation(
    () => {
      const topics: LessonPlanTopicInput[] = (detail.data?.topics ?? []).map((t) => ({ syllabusTopicId: t.syllabusTopicId, plannedDate: dates[t.syllabusTopicId] || null, plannedPeriods: t.plannedPeriods }));
      return rescheduleLessonPlan(plan!.id, { topics, plannedStartDate: start, plannedEndDate: end, reason: reason.trim(), rowVersion: detail.data?.rowVersion });
    },
    { success: "Lessons rescheduled", onSuccess: onClose },
  );
  const outside = (detail.data?.topics ?? []).some((t) => dates[t.syllabusTopicId] && (dates[t.syllabusTopicId] < start || dates[t.syllabusTopicId] > end));
  const invalid = !reason.trim() || !start || !end || end < start || outside;

  return (
    <Dialog open={Boolean(plan)} onOpenChange={(open) => !open && !save.isPending && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Reschedule lessons</DialogTitle>
          <DialogDescription>Move lessons when the academic schedule changes. The change is saved as a revision with your reason; if your school requires approval, the plan goes back for review.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 overflow-y-auto">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Plan starts" htmlFor="rs-start">
              <Input id="rs-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
            </FormField>
            <FormField label="Plan ends" htmlFor="rs-end" error={end && start && end < start ? "Can't be before the start" : undefined}>
              <Input id="rs-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
            </FormField>
          </div>
          {detail.isLoading && <Skeleton className="h-24 w-full" />}
          <ul className="divide-y divide-border rounded-lg border border-border">
            {detail.data?.topics?.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                <span className="min-w-0 flex-1 truncate">{t.topicTitle}</span>
                <Input aria-label={`Date for ${t.topicTitle}`} type="date" className="w-40" value={dates[t.syllabusTopicId] ?? ""} min={start || undefined} max={end || undefined} onChange={(e) => setDates({ ...dates, [t.syllabusTopicId]: e.target.value })} />
              </li>
            ))}
          </ul>
          {outside && <p role="alert" className="text-xs text-destructive-strong">Every lesson's date must fall inside the plan's dates.</p>}
          <FormField label="Reason" htmlFor="rs-reason" required>
            <Textarea id="rs-reason" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={900} />
          </FormField>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate(undefined)} disabled={invalid || !detail.data} loading={save.isPending}>
            Save new dates
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Create / edit ───────────────────────────────────────────────────────────

const planSchema = z
  .object({
    classId: z.string().min(1, "Choose a class"),
    sectionId: z.string().optional(),
    subjectId: z.string().min(1, "Choose a subject"),
    staffId: z.string().optional(),
    title: z.string().trim().min(1, "Give the plan a title").max(200),
    description: z.string().max(4000, "At most 4000 characters").optional(),
    planType: z.enum(["Weekly", "Monthly", "TermWise", "Annual"]),
    plannedStartDate: z.string().min(1, "Choose a start date"),
    plannedEndDate: z.string().min(1, "Choose an end date"),
    allocatedPeriods: z.coerce.number({ message: "Enter a number" }).int().min(0, "At least 0").max(2000, "At most 2000"),
    changeNote: z.string().max(900).optional(),
  })
  .refine((v) => !v.plannedStartDate || !v.plannedEndDate || v.plannedEndDate >= v.plannedStartDate, { path: ["plannedEndDate"], message: "The end can't be before the start" });
type PlanForm = z.input<typeof planSchema>;

function PlanFormDialog({ open, editing, onOpenChange, data, canAssign }: { open: boolean; editing: LessonPlan | null; onOpenChange: (o: boolean) => void; data: ReturnType<typeof useReferenceData>; canAssign: boolean }) {
  const { register, handleSubmit, control, reset, watch, setValue, setError, formState } = useForm<PlanForm, unknown, z.output<typeof planSchema>>({ resolver: zodResolver(planSchema) });
  const { errors, isDirty } = formState;
  const [topics, setTopics] = useState<LessonPlanTopicInput[]>([]);
  const [syllabusId, setSyllabusId] = useState<string | undefined>();
  const [aiDraft, setAiDraft] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [topicsDirty, setTopicsDirty] = useState(false);

  const existing = useQuery({ queryKey: ["portions", "lesson-plan", editing?.id], queryFn: () => getLessonPlan(editing!.id), enabled: open && Boolean(editing) });

  useEffect(() => {
    if (!open) return;
    setTopicsDirty(false);
    if (editing) {
      if (!existing.data) return;
      const p = existing.data;
      reset({ classId: p.classId, sectionId: p.sectionId ?? "", subjectId: p.subjectId, staffId: p.staffId, title: p.title, description: p.description, planType: p.planType, plannedStartDate: p.plannedStartDate ?? "", plannedEndDate: p.plannedEndDate ?? "", allocatedPeriods: p.allocatedPeriods, changeNote: "" });
      setTopics((p.topics ?? []).map((t) => ({ syllabusTopicId: t.syllabusTopicId, plannedDate: t.plannedDate ?? null, plannedPeriods: t.plannedPeriods })));
      setSyllabusId(p.syllabusPlanId ?? undefined);
      setAiDraft(p.isAiGenerated);
    } else {
      const start = todayIso();
      reset({ classId: "", sectionId: "", subjectId: "", staffId: "", title: "", description: "", planType: "Weekly", plannedStartDate: start, plannedEndDate: addDays(start, 6), allocatedPeriods: 0, changeNote: "" });
      setTopics([]);
      setSyllabusId(undefined);
      setAiDraft(false);
    }
  }, [open, editing, existing.data, reset]);

  const classId = watch("classId");
  const subjectId = watch("subjectId");
  const sectionId = watch("sectionId");
  const start = watch("plannedStartDate");
  const end = watch("plannedEndDate");
  const planned = topics.reduce((sum, t) => sum + t.plannedPeriods, 0);

  // The published syllabus for the chosen class + subject (the school's current year, unless a plan already points elsewhere).
  const syllabi = useQuery({
    queryKey: ["portions", "syllabi", "for-plan", classId, subjectId],
    queryFn: () => listSyllabi({ classId, subjectId, status: "Published", pageSize: 20 }),
    enabled: open && Boolean(classId && subjectId),
  });
  useEffect(() => {
    const items = syllabi.data?.items ?? [];
    if (items.length > 0 && !items.some((s) => s.id === syllabusId)) setSyllabusId(items[0].id);
    if (syllabi.data && items.length === 0 && !editing) setSyllabusId(undefined);
  }, [syllabi.data, syllabusId, editing]);

  const syllabus = useQuery({ queryKey: ["portions", "syllabus", syllabusId], queryFn: () => getSyllabus(syllabusId!), enabled: open && Boolean(syllabusId) });

  const sectionsOfClass = data.sections.filter((s) => s.classId === classId);
  const capacitySection = sectionId || sectionsOfClass[0]?.id;
  const capacity = useQuery({
    queryKey: ["portions", "capacity", capacitySection, subjectId, start, end, planned],
    queryFn: () => planCapacity({ sectionId: capacitySection!, subjectId, from: start, to: end, requiredPeriods: planned }),
    enabled: open && Boolean(capacitySection && subjectId && start && end && end >= start),
  });

  const save = useApiMutation(
    (v: z.output<typeof planSchema>) => {
      const body = { ...v, sectionId: v.sectionId || null, staffId: v.staffId || null, syllabusPlanId: syllabusId ?? null, academicYearId: syllabus.data?.summary.academicYearId ?? null, topics, isAiGenerated: aiDraft, description: v.description ?? "", rowVersion: existing.data?.rowVersion };
      return editing ? updateLessonPlan(editing.id, body) : createLessonPlan(body);
    },
    { success: editing ? "Lesson plan saved" : "Lesson plan saved as a draft", onSuccess: () => onOpenChange(false) },
  );

  const dirty = isDirty || topicsDirty;
  const close = guardedClose(dirty, save.isPending, onOpenChange);
  const approved = editing?.approvalStatus === "Approved";

  const toggleTopic = (id: string, on: boolean, periods: number) => {
    setTopicsDirty(true);
    setTopics((cur) => (on ? (cur.some((t) => t.syllabusTopicId === id) ? cur : [...cur, { syllabusTopicId: id, plannedDate: null, plannedPeriods: periods }]) : cur.filter((t) => t.syllabusTopicId !== id)));
  };
  const patchTopic = (id: string, patch: Partial<LessonPlanTopicInput>) => {
    setTopicsDirty(true);
    setTopics((cur) => cur.map((t) => (t.syllabusTopicId === id ? { ...t, ...patch } : t)));
  };

  /** Spreads the chosen topics over the Monday-Saturday teaching days of the plan, in order, skipping the school's closed days. */
  const distribute = () => {
    if (!start || !end || topics.length === 0) return;
    const days: string[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) if (new Date(`${d}T00:00:00`).getDay() !== 0) days.push(d);
    if (days.length === 0) return;
    setTopicsDirty(true);
    setTopics(topics.map((t, i) => ({ ...t, plannedDate: days[Math.min(days.length - 1, Math.floor((i * days.length) / topics.length))] })));
  };

  const loadingExisting = Boolean(editing) && !existing.data;
  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? (approved ? "Revise lesson plan" : "Edit lesson plan") : "New lesson plan"}</DialogTitle>
            <DialogDescription>
              {approved ? "This plan is approved. Saving creates a numbered revision with your reason, and may go back for approval." : "Choose the class and subject, then the topics you will teach and when. Plans start as drafts."}
            </DialogDescription>
          </DialogHeader>
          {loadingExisting ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <form
              id="plan-form"
              onSubmit={handleSubmit((v) => {
                if (approved && !v.changeNote?.trim()) return setError("changeNote", { message: "Say why the approved plan is being revised" });
                save.mutate(v);
              })}
              className="space-y-5 overflow-y-auto"
              noValidate
            >
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Class" htmlFor="pl-class" required error={errors.classId?.message}>
                  <Controller control={control} name="classId" render={({ field }) => <SelectField id="pl-class" value={field.value} onChange={(v) => { field.onChange(v ?? ""); setValue("sectionId", ""); setTopics([]); setTopicsDirty(true); }} items={data.classes.map((c) => ({ value: c.id, label: c.name }))} placeholder="Choose" className="w-full" invalid={Boolean(errors.classId)} />} />
                </FormField>
                <FormField label="Section" htmlFor="pl-section" optional>
                  <Controller control={control} name="sectionId" render={({ field }) => <SelectField id="pl-section" value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} allLabel="All sections" disabled={!classId} items={sectionsOfClass.map((s) => ({ value: s.id, label: s.name }))} className="w-full" />} />
                </FormField>
                <FormField label="Subject" htmlFor="pl-subject" required error={errors.subjectId?.message}>
                  <Controller control={control} name="subjectId" render={({ field }) => <SelectField id="pl-subject" value={field.value} onChange={(v) => { field.onChange(v ?? ""); setTopics([]); setTopicsDirty(true); }} items={data.subjects.filter((s) => !classId || s.classIds.length === 0 || s.classIds.includes(classId)).map((s) => ({ value: s.id, label: s.name }))} placeholder="Choose" className="w-full" invalid={Boolean(errors.subjectId)} />} />
                </FormField>
              </div>
              {canAssign && (
                <FormField label="Teacher" htmlFor="pl-teacher" optional hint="Leave empty to plan for yourself. Assigning a plan to a colleague is recorded.">
                  <Controller control={control} name="staffId" render={({ field }) => <SelectField id="pl-teacher" value={field.value || undefined} onChange={(v) => field.onChange(v ?? "")} allLabel="Me" items={data.teachers.map((t) => ({ value: t.id, label: t.name }))} className="w-full" />} />
                </FormField>
              )}
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Title" htmlFor="pl-title" required error={errors.title?.message}>
                  <Input id="pl-title" {...register("title")} aria-invalid={errors.title ? true : undefined} />
                </FormField>
                <FormField label="Plan type" htmlFor="pl-type" required>
                  <Controller control={control} name="planType" render={({ field }) => <SelectField id="pl-type" value={field.value} onChange={(v) => field.onChange(v ?? "Weekly")} items={options(PLAN_TYPE_LABEL)} className="w-full" />} />
                </FormField>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <FormField label="Starts" htmlFor="pl-start" required error={errors.plannedStartDate?.message}>
                  <Input id="pl-start" type="date" {...register("plannedStartDate")} aria-invalid={errors.plannedStartDate ? true : undefined} />
                </FormField>
                <FormField label="Ends" htmlFor="pl-end" required error={errors.plannedEndDate?.message}>
                  <Input id="pl-end" type="date" {...register("plannedEndDate")} aria-invalid={errors.plannedEndDate ? true : undefined} />
                </FormField>
                <FormField label="Periods available" htmlFor="pl-periods" required error={errors.allocatedPeriods?.message}>
                  <Input id="pl-periods" inputMode="numeric" {...register("allocatedPeriods")} aria-invalid={errors.allocatedPeriods ? true : undefined} />
                </FormField>
              </div>

              <div className="space-y-2" aria-live="polite">
                {capacity.data && (
                  <p className={`rounded-lg px-3 py-2 text-sm ${capacity.data.realistic || planned === 0 ? "bg-secondary/50" : "bg-warning-soft text-warning-strong"}`}>
                    {capacity.data.periodsPerWeek === 0
                      ? "This subject isn't in the timetable for the section, so the periods available can't be checked."
                      : `${capacity.data.availablePeriods} timetabled period${capacity.data.availablePeriods === 1 ? "" : "s"} fall between these dates${capacity.data.noTeachingDays.length ? ` after ${capacity.data.noTeachingDays.length} holiday or exam day${capacity.data.noTeachingDays.length === 1 ? "" : "s"}` : ""}; your topics need ${planned}.${!capacity.data.realistic && planned > 0 ? " That is more than the time available. Move the end date or choose fewer topics." : ""}`}
                  </p>
                )}
              </div>

              <section className="space-y-2" aria-labelledby="pl-topics">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 id="pl-topics" className="text-sm font-semibold">
                    Topics ({topics.length} chosen · {planned} periods)
                  </h3>
                  <div className="flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={distribute} disabled={topics.length === 0}>
                      <CalendarClock className="h-4 w-4" /> Spread across the dates
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setAiOpen(true)} disabled={!classId || !subjectId}>
                      <Sparkles className="h-4 w-4" /> Draft with AI
                    </Button>
                  </div>
                </div>
                {!classId || !subjectId ? (
                  <p className="text-sm text-muted-foreground">Choose a class and subject to pick topics from its syllabus.</p>
                ) : syllabi.isLoading || (syllabusId && syllabus.isLoading) ? (
                  <Skeleton className="h-24 w-full" />
                ) : !syllabusId ? (
                  <p className="rounded-lg border border-dashed border-border px-3 py-3 text-sm text-muted-foreground">There's no published syllabus for this class and subject, so topics can't be chosen. You can still save the plan with a description.</p>
                ) : (
                  <>
                    {(syllabi.data?.items.length ?? 0) > 1 && (
                      <SelectField aria-label="Syllabus" value={syllabusId} onChange={(v) => { setSyllabusId(v); setTopics([]); setTopicsDirty(true); }} items={(syllabi.data?.items ?? []).map((s) => ({ value: s.id, label: `${s.title} (v${s.version})` }))} className="w-full" />
                    )}
                    <TopicPicker detail={syllabus.data} chosen={topics} start={start} end={end} onToggle={toggleTopic} onPatch={patchTopic} />
                  </>
                )}
              </section>

              <FormField label="Description and teaching approach" htmlFor="pl-desc" optional error={errors.description?.message}>
                <Textarea id="pl-desc" rows={5} {...register("description")} />
              </FormField>
              {aiDraft && <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">Part of this plan was drafted by AI. Read it, correct it, and submit it yourself - nothing is published or recorded as taught until you and, if required, a coordinator approve it.</p>}
              {approved && (
                <FormField label="Reason for the revision" htmlFor="pl-change" required error={errors.changeNote?.message}>
                  <Textarea id="pl-change" rows={2} {...register("changeNote")} aria-invalid={errors.changeNote ? true : undefined} />
                </FormField>
              )}
            </form>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => close(false)}>
              Cancel
            </Button>
            <Button type="submit" form="plan-form" loading={save.isPending} disabled={loadingExisting}>
              {editing ? (approved ? "Save revision" : "Save changes") : "Save draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AiDraftDialog
        open={aiOpen}
        onOpenChange={setAiOpen}
        classId={classId}
        subjectId={subjectId}
        topicTitle={() => (syllabus.data?.chapters.flatMap((c) => c.topics).filter((t) => topics.some((x) => x.syllabusTopicId === t.id)).map((t) => t.title).join(", ")) || watch("title")}
        objectives={syllabus.data?.chapters.flatMap((c) => c.topics).filter((t) => topics.some((x) => x.syllabusTopicId === t.id) && t.learningObjectives).map((t) => t.learningObjectives).join("; ")}
        onDraft={(text, title) => {
          setValue("description", text, { shouldDirty: true });
          if (!watch("title")) setValue("title", title, { shouldDirty: true });
          setAiDraft(true);
        }}
      />
    </>
  );
}

function TopicPicker({
  detail,
  chosen,
  start,
  end,
  onToggle,
  onPatch,
}: {
  detail?: SyllabusDetail;
  chosen: LessonPlanTopicInput[];
  start: string;
  end: string;
  onToggle: (id: string, on: boolean, periods: number) => void;
  onPatch: (id: string, patch: Partial<LessonPlanTopicInput>) => void;
}) {
  const byId = useMemo(() => new Map(chosen.map((t) => [t.syllabusTopicId, t])), [chosen]);
  if (!detail) return null;
  const leaves = (c: Chapter) => {
    const parents = new Set(c.topics.map((t) => t.parentTopicId).filter(Boolean));
    return c.topics.filter((t) => !parents.has(t.id));
  };
  return (
    <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-border p-2">
      {detail.chapters.map((c) => {
        const ls = leaves(c);
        const all = ls.every((t) => byId.has(t.id));
        const some = ls.some((t) => byId.has(t.id));
        return (
          <fieldset key={c.id} className="space-y-1">
            <legend className="sr-only">{c.title}</legend>
            <label className="flex items-center gap-2 rounded-md bg-muted/40 px-2 py-1.5 text-sm font-medium">
              <Checkbox checked={all ? true : some ? "indeterminate" : false} onCheckedChange={(v) => ls.forEach((t) => onToggle(t.id, v === true, t.plannedPeriods))} aria-label={`Whole chapter ${c.title}`} />
              <span className="min-w-0 flex-1 truncate">{c.title}</span>
              <span className="text-xs font-normal text-muted-foreground">{c.deadline ? `due ${formatDate(c.deadline)}` : ""}</span>
            </label>
            {ls.map((t) => {
              const on = byId.get(t.id);
              return (
                <div key={t.id} className="flex flex-wrap items-center gap-2 pl-6 text-sm">
                  <label className="flex min-w-0 flex-1 items-center gap-2">
                    <Checkbox checked={Boolean(on)} onCheckedChange={(v) => onToggle(t.id, v === true, t.plannedPeriods)} aria-label={t.title} />
                    <span className="truncate">{t.title}</span>
                  </label>
                  {on ? (
                    <>
                      <Input aria-label={`Date for ${t.title}`} type="date" className="h-8 w-36" value={on.plannedDate ?? ""} min={start || undefined} max={end || undefined} onChange={(e) => onPatch(t.id, { plannedDate: e.target.value || null })} />
                      <Input aria-label={`Periods for ${t.title}`} inputMode="numeric" className="h-8 w-16" value={on.plannedPeriods} onChange={(e) => onPatch(t.id, { plannedPeriods: Math.max(0, Math.min(100, Number(e.target.value.replace(/\D/g, "")) || 0)) })} />
                    </>
                  ) : (
                    <span className="text-xs text-muted-foreground">{t.plannedPeriods}p</span>
                  )}
                </div>
              );
            })}
          </fieldset>
        );
      })}
    </div>
  );
}

// ── AI draft ────────────────────────────────────────────────────────────────

function AiDraftDialog({
  open,
  onOpenChange,
  classId,
  subjectId,
  topicTitle,
  objectives,
  onDraft,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  classId: string;
  subjectId: string;
  topicTitle: () => string;
  objectives?: string;
  onDraft: (text: string, title: string) => void;
}) {
  const [topic, setTopic] = useState("");
  const [minutes, setMinutes] = useState("40");
  const [goals, setGoals] = useState("");
  useEffect(() => {
    if (open) {
      setTopic(topicTitle());
      setGoals(objectives ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const gen = useMutation({
    mutationFn: () => generateLessonPlan({ classId, subjectId, topic: topic.trim(), durationMinutes: Number(minutes), learningObjectives: goals.trim() || undefined }),
    onSuccess: (r) => {
      onDraft(lessonPlanToText(r.content), r.content.title);
      onOpenChange(false);
    },
  });
  const invalid = !topic.trim() || !/^\d+$/.test(minutes) || Number(minutes) < 10 || Number(minutes) > 240;
  return (
    <Dialog open={open} onOpenChange={(o) => !gen.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Draft the description with AI</DialogTitle>
          <DialogDescription>The AI writes a lesson outline into the description box. It is only a draft: you review and edit it, and it is never published or recorded as taught on its own.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <FormField label="Topic" htmlFor="ai-topic" required>
            <Textarea id="ai-topic" rows={2} value={topic} onChange={(e) => setTopic(e.target.value)} maxLength={300} />
          </FormField>
          <FormField label="Minutes per period" htmlFor="ai-min" required error={invalid && minutes && !/^\d+$/.test(minutes) ? "Enter minutes" : undefined}>
            <Input id="ai-min" inputMode="numeric" className="w-28" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
          </FormField>
          <FormField label="Learning objectives" htmlFor="ai-goals" optional>
            <Textarea id="ai-goals" rows={3} value={goals} onChange={(e) => setGoals(e.target.value)} maxLength={1000} />
          </FormField>
          {gen.isError && (
            <p role="alert" className="text-sm text-destructive-strong">
              {gen.error instanceof Error ? gen.error.message : "The AI service couldn't draft the plan."}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={gen.isPending}>
            Cancel
          </Button>
          <Button onClick={() => gen.mutate()} disabled={invalid} loading={gen.isPending}>
            <Sparkles className="h-4 w-4" /> Draft
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
