import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Info, Link2, MonitorPlay, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/utils/cn";
import { getMeetingSettings, listSectionOptions, listSubjectOptions, scheduleMeeting } from "../api";
import { ALL_MEETING_TYPES, DURATION_OPTIONS, MEETING_TYPES, REMINDER_OPTIONS, TEACHER_MEETING_TYPES, WEEKDAYS } from "../constants";
import { meetingKeys, useMeetingRole } from "../hooks";
import type { MeetingType, ScheduleMeetingInput, Weekday } from "../types";
import { audienceKey, isoDate, nextQuarterHour, toLocalInputValue } from "../utils";
import AudiencePicker, { type PickedAudience } from "./AudiencePicker";

const NONE = "__none__";
const CLASS_TYPES: MeetingType[] = ["OnlineClass", "Examination", "ParentTeacherMeeting"];

const schema = z
  .object({
    meetingType: z.string(),
    title: z.string().trim().min(1, "Give it a title").max(200),
    description: z.string().max(4000).optional(),
    sectionId: z.string(),
    subjectId: z.string(),
    date: z.string().min(1, "Pick a date"),
    time: z.string().min(1, "Pick a start time"),
    durationMinutes: z.number().min(5).max(480),
    repeats: z.boolean(),
    days: z.array(z.string()),
    endDate: z.string(),
    provider: z.enum(["LiveKit", "ExternalLink"]),
    externalJoinUrl: z.string(),
    recordingEnabled: z.boolean(),
    chatEnabled: z.boolean(),
    schoolWide: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.repeats && v.days.length === 0) ctx.addIssue({ code: "custom", path: ["days"], message: "Pick at least one day" });
    if (v.repeats && (!v.endDate || v.endDate < v.date)) ctx.addIssue({ code: "custom", path: ["endDate"], message: "Choose an end date after the first class" });
    if (!v.repeats && new Date(`${v.date}T${v.time}`).getTime() < Date.now() - 5 * 60_000)
      ctx.addIssue({ code: "custom", path: ["time"], message: "That time has already passed" });
    if (v.provider === "ExternalLink" && !/^https:\/\/\S+$/.test(v.externalJoinUrl))
      ctx.addIssue({ code: "custom", path: ["externalJoinUrl"], message: "Paste the full https:// meeting link" });
  });

type FormValues = z.infer<typeof schema>;

function defaults(meetingType: MeetingType): FormValues {
  const start = nextQuarterHour();
  const end = new Date(start);
  end.setMonth(end.getMonth() + 3);
  const [date, time] = toLocalInputValue(start).split("T");
  const weekday = WEEKDAYS.find((d) => d.value === start.toLocaleDateString("en-US", { weekday: "long" }))?.value ?? "Monday";
  return {
    meetingType,
    title: "",
    description: "",
    sectionId: NONE,
    subjectId: NONE,
    date: date!,
    time: time!,
    durationMinutes: meetingType === "OnlineClass" ? 45 : 30,
    repeats: false,
    days: [weekday],
    endDate: isoDate(end),
    provider: "LiveKit",
    externalJoinUrl: "",
    recordingEnabled: false,
    chatEnabled: true,
    schoolWide: false,
  };
}

/** Client-side mirror of the server's session count, for the "Schedule 40 sessions" button. */
function countSessions(startDate: string, endDate: string, days: string[]): number {
  if (!startDate || !endDate || days.length === 0) return 0;
  const names = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let n = 0;
  for (let d = new Date(`${startDate}T12:00`); d <= new Date(`${endDate}T12:00`) && n < 500; d.setDate(d.getDate() + 1)) {
    if (days.includes(names[d.getDay()]!)) n++;
  }
  return n;
}

interface ScheduleMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialType?: MeetingType;
}

export default function ScheduleMeetingDialog({ open, onOpenChange, initialType = "OnlineClass" }: ScheduleMeetingDialogProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isManager, user } = useMeetingRole();
  const [audience, setAudience] = useState<PickedAudience[]>([]);
  const [reminders, setReminders] = useState<number[]>([1440, 15]);

  const { data: sections = [] } = useQuery({ queryKey: ["meetings", "sections"], queryFn: listSectionOptions, enabled: open, staleTime: 300_000 });
  const { data: subjects = [] } = useQuery({ queryKey: ["meetings", "subjects"], queryFn: listSubjectOptions, enabled: open, staleTime: 300_000 });
  const { data: settings } = useQuery({ queryKey: ["meetings", "settings"], queryFn: getMeetingSettings, enabled: open, staleTime: 300_000 });

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: defaults(initialType),
  });

  useEffect(() => {
    if (!open) return;
    reset(defaults(initialType));
    setAudience([]);
    setReminders(settings?.defaultReminderOffsetsMinutes?.length ? settings.defaultReminderOffsetsMinutes : [1440, 15]);
  }, [open, initialType, reset, settings]);

  const meetingType = watch("meetingType") as MeetingType;
  const sectionId = watch("sectionId");
  const subjectId = watch("subjectId");
  const repeats = watch("repeats");
  const days = watch("days");
  const provider = watch("provider");
  const date = watch("date");
  const endDate = watch("endDate");
  const title = watch("title");

  const section = sections.find((s) => s.id === sectionId) ?? null;
  const isClassType = CLASS_TYPES.includes(meetingType);
  const availableSubjects = useMemo(
    () => (section ? subjects.filter((s) => s.classIds.includes(section.classId)) : subjects),
    [subjects, section],
  );
  const allowedTypes = isManager ? ALL_MEETING_TYPES : TEACHER_MEETING_TYPES;
  const sessions = repeats ? countSessions(date, endDate, days) : 1;
  const noun = MEETING_TYPES[meetingType].noun;

  // Picking a class for a class-type meeting pre-selects "Whole class" - the common case is one tap.
  useEffect(() => {
    if (!section || !isClassType) return;
    setAudience((prev) => {
      const withoutOtherSections = prev.filter((a) => !(a.type === "Section" || a.type === "SectionGuardians") || a.targetId === section.id);
      const defaultType = meetingType === "ParentTeacherMeeting" ? "SectionGuardians" : "Section";
      if (withoutOtherSections.some((a) => a.type === defaultType)) return withoutOtherSections;
      const label = defaultType === "Section" ? `Whole class · ${section.label}` : `All parents of the class · ${section.label}`;
      return [...withoutOtherSections, { key: audienceKey(defaultType, section.id), type: defaultType, targetId: section.id, label }];
    });
  }, [section, isClassType, meetingType]);

  // A subject pick fills an empty title ("Mathematics"), the way teachers name classes anyway.
  useEffect(() => {
    const subject = subjects.find((s) => s.id === subjectId);
    if (subject && !title.trim()) setValue("title", subject.name);
  }, [subjectId, subjects, title, setValue]);

  const mutation = useMutation({
    mutationFn: scheduleMeeting,
    onSuccess: (result, input) => {
      void queryClient.invalidateQueries({ queryKey: meetingKeys.all });
      const what = result.sessionsPlanned > 1 ? `${result.sessionsPlanned} sessions scheduled` : input.saveAsDraft ? "Draft saved" : `${MEETING_TYPES[input.meetingType].label} scheduled`;
      toast.success(what);
      if (result.unlinkedCount > 0) {
        toast(`${result.unlinkedCount} ${result.unlinkedCount === 1 ? "person has" : "people have"} no login yet, so ${result.unlinkedCount === 1 ? "wasn't" : "weren't"} invited. Link their accounts in Student or Staff profiles.`, { icon: <Info className="h-4 w-4 shrink-0 text-info-strong" />, duration: 7000 });
      }
      onOpenChange(false);
      navigate(`/online-classes/${result.firstSession.id}`);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submit = (saveAsDraft: boolean) =>
    handleSubmit((v) => {
      if (!saveAsDraft && audience.length === 0) {
        toast.error("Invite at least one class, group or person.");
        return;
      }
      const start = new Date(`${v.date}T${v.time}`);
      const input: ScheduleMeetingInput = {
        title: v.title.trim(),
        description: v.description?.trim() || undefined,
        meetingType: v.meetingType as MeetingType,
        sectionId: v.sectionId === NONE ? null : v.sectionId,
        subjectId: v.subjectId === NONE ? null : v.subjectId,
        startUtc: start.toISOString(),
        durationMinutes: v.durationMinutes,
        audience: audience.map(({ type, targetId }) => ({ type, targetId })),
        recurrence: v.repeats
          ? {
              frequency: "Weekly",
              interval: 1,
              daysOfWeek: v.days as Weekday[],
              startDate: v.date,
              endDate: v.endDate,
              localStartTime: v.time,
              timeZoneId: Intl.DateTimeFormat().resolvedOptions().timeZone,
            }
          : null,
        reminderOffsetsMinutes: reminders,
        provider: v.repeats ? "LiveKit" : v.provider,
        externalJoinUrl: v.provider === "ExternalLink" && !v.repeats ? v.externalJoinUrl : null,
        recordingEnabled: v.recordingEnabled,
        chatEnabled: v.chatEnabled,
        saveAsDraft,
        schoolWide: v.schoolWide,
        hostDisplayName: user?.name,
      };
      mutation.mutate(input);
    });

  const fieldError = (message?: string) => (message ? <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{message}</p> : null);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Schedule {noun === "class" ? "a class" : noun === "exam" ? "an exam" : "a meeting"}</DialogTitle>
          <DialogDescription>Everyone you invite gets a notification and a reminder before it starts.</DialogDescription>
        </DialogHeader>

        <form onSubmit={submit(false)} className="gap-5">
          {/* What */}
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-medium text-foreground">What is it?</legend>
            <Controller
              control={control}
              name="meetingType"
              render={({ field }) => (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {allowedTypes.map((type) => {
                    const config = MEETING_TYPES[type];
                    const Icon = config.icon;
                    const on = field.value === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        aria-pressed={on}
                        onClick={() => field.onChange(type)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          on ? "border-primary bg-accent font-semibold text-accent-foreground" : "border-border hover:bg-secondary",
                        )}
                      >
                        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-md", config.chip)}>
                          <Icon className="h-3.5 w-3.5" aria-hidden />
                        </span>
                        <span className="leading-tight">{config.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            />
          </fieldset>

          {/* Class + subject */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="meeting-section">Class {isClassType ? "" : <span className="font-normal text-muted-foreground">(optional)</span>}</Label>
              <Controller
                control={control}
                name="sectionId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="meeting-section"><SelectValue placeholder="Pick a class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No specific class</SelectItem>
                      {sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting-subject">Subject <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Controller
                control={control}
                name="subjectId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="meeting-subject"><SelectValue placeholder="Pick a subject" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>No subject</SelectItem>
                      {availableSubjects.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="meeting-title">Title</Label>
            <Input id="meeting-title" placeholder={meetingType === "OnlineClass" ? "e.g. Mathematics: Fractions" : "e.g. Term planning"} aria-invalid={errors.title ? true : undefined} {...register("title")} />
            {fieldError(errors.title?.message)}
          </div>

          {/* When */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-[1.3fr_1fr_1fr]">
            <div className="col-span-2 space-y-1.5 sm:col-span-1">
              <Label htmlFor="meeting-date">{repeats ? "First class" : "Date"}</Label>
              <Input id="meeting-date" type="date" aria-invalid={errors.date ? true : undefined} {...register("date")} />
              {fieldError(errors.date?.message)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting-time">Starts</Label>
              <Input id="meeting-time" type="time" step={300} aria-invalid={errors.time ? true : undefined} {...register("time")} />
              {fieldError(errors.time?.message)}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="meeting-duration">Length</Label>
              <Controller
                control={control}
                name="durationMinutes"
                render={({ field }) => (
                  <Select value={String(field.value)} onValueChange={(v) => field.onChange(Number(v))}>
                    <SelectTrigger id="meeting-duration"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DURATION_OPTIONS.map((d) => <SelectItem key={d} value={String(d)}>{d < 60 ? `${d} min` : `${d / 60} h`}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>

          {/* Repeats */}
          <div className="space-y-3 rounded-xl border border-border p-3">
            <label className="flex cursor-pointer items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Repeat className="h-4 w-4 text-muted-foreground" aria-hidden /> Repeats every week
              </span>
              <Controller control={control} name="repeats" render={({ field }) => <Switch id="meeting-repeats" checked={field.value} onCheckedChange={field.onChange} />} />
            </label>
            {repeats && (
              <div className="space-y-3">
                <Controller
                  control={control}
                  name="days"
                  render={({ field }) => (
                    <div className="flex gap-1.5" role="group" aria-label="Days of the week">
                      {WEEKDAYS.map((d) => {
                        const on = field.value.includes(d.value);
                        return (
                          <button
                            key={d.value}
                            type="button"
                            aria-pressed={on}
                            aria-label={d.value}
                            title={d.value}
                            onClick={() => field.onChange(on ? field.value.filter((x) => x !== d.value) : [...field.value, d.value])}
                            className={cn(
                              "h-9 w-9 rounded-full text-xs font-semibold transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                              on ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground hover:bg-secondary",
                            )}
                          >
                            {d.short.slice(0, 2)}
                          </button>
                        );
                      })}
                    </div>
                  )}
                />
                {fieldError(errors.days?.message)}
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <Label htmlFor="meeting-until" className="font-normal text-muted-foreground">Until</Label>
                  <Input id="meeting-until" type="date" className="w-44" aria-invalid={errors.endDate ? true : undefined} {...register("endDate")} />
                  {sessions > 0 && <span className="text-muted-foreground">· {sessions} sessions</span>}
                </div>
                {fieldError(errors.endDate?.message)}
              </div>
            )}
          </div>

          {/* Who */}
          <div className="space-y-2">
            <Label>Who's invited</Label>
            <AudiencePicker meetingType={meetingType} sectionId={section?.id ?? null} sectionLabel={section?.label ?? null} value={audience} onChange={setAudience} />
          </div>

          {/* Reminders */}
          <div className="space-y-2">
            <Label>Remind everyone</Label>
            <div className="flex flex-wrap gap-2">
              {REMINDER_OPTIONS.map((r) => {
                const on = reminders.includes(r.value);
                return (
                  <button
                    key={r.value}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setReminders(on ? reminders.filter((x) => x !== r.value) : [...reminders, r.value])}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      on ? "border-primary bg-accent text-accent-foreground" : "border-border text-secondary-foreground hover:bg-secondary",
                    )}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Where */}
          {!repeats && (
            <Controller
              control={control}
              name="provider"
              render={({ field }) => (
                <div className="space-y-2">
                  <Label>Where</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {([
                      { value: "LiveKit", label: "Built-in video room", hint: "Attendance is taken for you", icon: MonitorPlay },
                      { value: "ExternalLink", label: "Paste a link", hint: "Zoom, Meet or Teams", icon: Link2 },
                    ] as const).map((o) => (
                      <button
                        key={o.value}
                        type="button"
                        aria-pressed={field.value === o.value}
                        onClick={() => field.onChange(o.value)}
                        className={cn(
                          "flex items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          field.value === o.value ? "border-primary bg-accent" : "border-border hover:bg-secondary",
                        )}
                      >
                        <o.icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <span>
                          <span className="block font-medium text-foreground">{o.label}</span>
                          <span className="block text-xs text-muted-foreground">{o.hint}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  {provider === "ExternalLink" && (
                    <>
                      <Input id="meeting-link" placeholder="https://…" aria-invalid={errors.externalJoinUrl ? true : undefined} {...register("externalJoinUrl")} />
                      {fieldError(errors.externalJoinUrl?.message)}
                      <p className="text-xs text-muted-foreground">The link stays hidden until someone joins, and only invited people get it.</p>
                    </>
                  )}
                </div>
              )}
            />
          )}

          <details className="group rounded-xl border border-border px-3 py-2 [&_summary::-webkit-details-marker]:hidden">
            <summary className="cursor-pointer select-none text-sm font-medium text-foreground">More options</summary>
            <div className="mt-3 space-y-3 pb-1">
              <div className="space-y-1.5">
                <Label htmlFor="meeting-description">Description</Label>
                <Textarea id="meeting-description" rows={3} placeholder="What will you cover? Anything to prepare?" {...register("description")} />
              </div>
              <label className="flex items-center justify-between gap-3 text-sm">
                <span>Chat during the {noun}</span>
                <Controller control={control} name="chatEnabled" render={({ field }) => <Switch id="meeting-chat" checked={field.value} onCheckedChange={field.onChange} />} />
              </label>
              <label className={cn("flex items-center justify-between gap-3 text-sm", !settings?.recordingAvailable && "opacity-60")}>
                <span>
                  Allow recording
                  {!settings?.recordingAvailable && <span className="block text-xs text-muted-foreground">Recording isn't set up on this server yet.</span>}
                </span>
                <Controller control={control} name="recordingEnabled" render={({ field }) => <Switch id="meeting-recording" disabled={!settings?.recordingAvailable} checked={field.value} onCheckedChange={field.onChange} />} />
              </label>
              {isManager && !isClassType && (
                <label className="flex items-center justify-between gap-3 text-sm">
                  <span>
                    School-wide
                    <span className="block text-xs text-muted-foreground">Visible across every branch, not just this one.</span>
                  </span>
                  <Controller control={control} name="schoolWide" render={({ field }) => <Switch id="meeting-schoolwide" checked={field.value} onCheckedChange={field.onChange} />} />
                </label>
              )}
            </div>
          </details>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={submit(true)} disabled={mutation.isPending}>
              Save as draft
            </Button>
            <Button type="submit" loading={mutation.isPending}>
              {repeats && sessions > 1 ? `Schedule ${sessions} sessions` : `Schedule ${noun}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
