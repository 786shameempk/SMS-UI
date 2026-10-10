import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { getSessionAttendance, listTeams } from "../api";
import { ATTENDANCE_LABEL, RECURRENCE_LABEL } from "../constants";
import { SelectField, formatDate, formatTime, options, todayIso } from "../shared";
import type { Activity, Recurrence, Session, SessionAttendanceStatus, SessionInput } from "../types";

interface FormState {
  activityId: string;
  teamId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  instructorName: string;
  recurrence: Recurrence;
  repeatUntil: string;
  repeatCount: string;
}

const blank = (activityId = ""): FormState => ({ activityId, teamId: "", title: "", date: todayIso(), startTime: "16:00", endTime: "17:00", venue: "", instructorName: "", recurrence: "None", repeatUntil: "", repeatCount: "" });

export function SessionFormDialog({
  open,
  onOpenChange,
  session,
  activities,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: Session | null;
  activities: Activity[];
  submitting: boolean;
  onSubmit: (input: SessionInput) => Promise<void>;
}) {
  const [v, setV] = useState<FormState>(blank());
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setV(
      session
        ? { activityId: session.activityId, teamId: session.teamId ?? "", title: session.title, date: session.date, startTime: formatTime(session.startTime), endTime: formatTime(session.endTime), venue: session.venue ?? "", instructorName: session.instructorName ?? "", recurrence: "None", repeatUntil: "", repeatCount: "" }
        : blank(activities[0]?.id),
    );
  }, [open, session, activities]);

  const teams = useQuery({ queryKey: ["extracurricular", "teams", v.activityId], queryFn: () => listTeams(v.activityId), enabled: open && Boolean(v.activityId) });
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setV((s) => ({ ...s, [key]: value }));

  const submit = async () => {
    const next: typeof errors = {};
    if (!v.activityId) next.activityId = "Choose an activity";
    if (!v.title.trim()) next.title = "Title is required";
    if (!v.date) next.date = "Date is required";
    if (!v.startTime) next.startTime = "Start time is required";
    if (!v.endTime) next.endTime = "End time is required";
    else if (v.startTime && v.endTime <= v.startTime) next.endTime = "The session must end after it starts";
    if (v.recurrence !== "None" && !v.repeatUntil && !v.repeatCount) next.repeatUntil = "Say when it stops: an end date or a number of sessions";
    if (v.repeatCount && !/^\d+$/.test(v.repeatCount)) next.repeatCount = "Enter a whole number";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    await onSubmit({
      activityId: v.activityId,
      teamId: v.teamId || null,
      title: v.title.trim(),
      date: v.date,
      startTime: `${v.startTime}:00`,
      endTime: `${v.endTime}:00`,
      venue: v.venue.trim() || null,
      instructorName: v.instructorName.trim() || null,
      instructorStaffId: session?.instructorStaffId ?? null,
      recurrence: v.recurrence,
      repeatUntil: v.repeatUntil || null,
      repeatCount: v.repeatCount ? Number(v.repeatCount) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{session ? "Reschedule session" : "New session"}</DialogTitle>
          <DialogDescription>The venue, the instructor and the team are checked for clashes before anything is saved.</DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <FormField label="Activity" htmlFor="ses-activity" required error={errors.activityId}>
            <SelectField id="ses-activity" value={v.activityId || undefined} onChange={(x) => { set("activityId", x ?? ""); set("teamId", ""); }} items={activities.map((a) => ({ value: a.id, label: a.name }))} placeholder="Choose an activity" disabled={Boolean(session)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Title" htmlFor="ses-title" required error={errors.title}>
              <Input id="ses-title" value={v.title} onChange={(e) => set("title", e.target.value)} aria-invalid={errors.title ? true : undefined} />
            </FormField>
            <FormField label="Team" htmlFor="ses-team" optional hint="Leave empty for the whole activity">
              <SelectField id="ses-team" value={v.teamId || undefined} onChange={(x) => set("teamId", x ?? "")} allLabel="Whole activity" items={(teams.data ?? []).map((t) => ({ value: t.id, label: t.name }))} />
            </FormField>
            <FormField label="Date" htmlFor="ses-date" required error={errors.date}>
              <Input id="ses-date" type="date" value={v.date} onChange={(e) => set("date", e.target.value)} />
            </FormField>
            <div className="grid grid-cols-2 gap-3">
              <FormField label="Starts" htmlFor="ses-start" required error={errors.startTime}>
                <Input id="ses-start" type="time" value={v.startTime} onChange={(e) => set("startTime", e.target.value)} />
              </FormField>
              <FormField label="Ends" htmlFor="ses-end" required error={errors.endTime}>
                <Input id="ses-end" type="time" value={v.endTime} onChange={(e) => set("endTime", e.target.value)} aria-invalid={errors.endTime ? true : undefined} />
              </FormField>
            </div>
            <FormField label="Venue" htmlFor="ses-venue" optional>
              <Input id="ses-venue" value={v.venue} onChange={(e) => set("venue", e.target.value)} />
            </FormField>
            <FormField label="Instructor" htmlFor="ses-instructor" optional>
              <Input id="ses-instructor" value={v.instructorName} onChange={(e) => set("instructorName", e.target.value)} />
            </FormField>
          </div>
          {!session && (
            <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-3">
              <FormField label="Repeats" htmlFor="ses-repeat">
                <SelectField id="ses-repeat" value={v.recurrence} onChange={(x) => x && set("recurrence", x)} items={options(RECURRENCE_LABEL)} />
              </FormField>
              {v.recurrence !== "None" && (
                <>
                  <FormField label="Until" htmlFor="ses-until" optional error={errors.repeatUntil}>
                    <Input id="ses-until" type="date" value={v.repeatUntil} onChange={(e) => set("repeatUntil", e.target.value)} />
                  </FormField>
                  <FormField label="Or number of sessions" htmlFor="ses-count" optional error={errors.repeatCount}>
                    <Input id="ses-count" inputMode="numeric" value={v.repeatCount} onChange={(e) => set("repeatCount", e.target.value)} />
                  </FormField>
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {session ? "Save" : v.recurrence === "None" ? "Create session" : "Create series"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CancelSessionDialog({
  session,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  session: Session | null;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  onSubmit: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setReason("");
    setTouched(false);
  }, [session]);
  return (
    <Dialog open={Boolean(session)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancel session</DialogTitle>
          <DialogDescription>
            {session?.title} on {formatDate(session?.date)}
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-4"
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            setTouched(true);
            if (reason.trim()) void onSubmit(reason.trim());
          }}
        >
          <FormField label="Reason" htmlFor="cancel-reason" required error={touched && !reason.trim() ? "Say why the session is cancelled" : undefined}>
            <Textarea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Keep session
            </Button>
            <Button type="submit" variant="destructive" loading={submitting}>
              Cancel session
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

const ORDER: SessionAttendanceStatus[] = ["Present", "Late", "Excused", "Absent"];

export function AttendanceDialog({
  session,
  onOpenChange,
  submitting,
  readOnly,
  onSubmit,
}: {
  session: Session | null;
  onOpenChange: (open: boolean) => void;
  submitting: boolean;
  readOnly: boolean;
  onSubmit: (marks: { studentId: string; status: SessionAttendanceStatus }[]) => Promise<void>;
}) {
  const register = useQuery({ queryKey: ["extracurricular", "register", session?.id], queryFn: () => getSessionAttendance(session!.id), enabled: Boolean(session), staleTime: 0 });
  const [marks, setMarks] = useState<Record<string, SessionAttendanceStatus | undefined>>({});

  useEffect(() => {
    if (register.data) setMarks(Object.fromEntries(register.data.map((r) => [r.studentId, r.status ?? undefined])));
  }, [register.data]);

  const rows = register.data ?? [];
  const marked = rows.filter((r) => marks[r.studentId]).length;
  const markAll = (status: SessionAttendanceStatus) => setMarks(Object.fromEntries(rows.map((r) => [r.studentId, status])));

  return (
    <Dialog open={Boolean(session)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Attendance</DialogTitle>
          <DialogDescription>
            {session?.title} · {formatDate(session?.date)} · {formatTime(session?.startTime)}–{formatTime(session?.endTime)}
          </DialogDescription>
        </DialogHeader>
        {register.isLoading && <Skeleton className="h-40 w-full" />}
        {register.isError && <ErrorState onRetry={() => register.refetch()} retrying={register.isFetching} />}
        {register.data && rows.length === 0 && <EmptyState size="sm" bare title="Nobody to mark" description="Approved students of this activity (or the team's members) appear here." />}
        {rows.length > 0 && (
          <div className="space-y-3">
            {!readOnly && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-muted-foreground">
                  {marked} of {rows.length} marked
                </p>
                <Button type="button" size="sm" variant="outline" onClick={() => markAll("Present")}>
                  Mark everyone present
                </Button>
              </div>
            )}
            <ul className="divide-y divide-border rounded-lg border border-border">
              {rows.map((r) => (
                <li key={r.studentId} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <span className="text-sm font-medium">{r.studentName}</span>
                  <div role="radiogroup" aria-label={`Attendance for ${r.studentName}`} className="flex gap-1">
                    {ORDER.map((status) => (
                      <button
                        key={status}
                        type="button"
                        role="radio"
                        aria-checked={marks[r.studentId] === status}
                        disabled={readOnly}
                        onClick={() => setMarks((m) => ({ ...m, [r.studentId]: status }))}
                        className={
                          marks[r.studentId] === status
                            ? "rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground"
                            : "rounded-md border border-border px-2.5 py-1 text-xs text-muted-foreground hover:bg-secondary disabled:opacity-60"
                        }
                      >
                        {ATTENDANCE_LABEL[status]}
                      </button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button
              type="button"
              loading={submitting}
              disabled={marked === 0}
              onClick={() => void onSubmit(rows.filter((r) => marks[r.studentId]).map((r) => ({ studentId: r.studentId, status: marks[r.studentId]! })))}
            >
              Save attendance
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
