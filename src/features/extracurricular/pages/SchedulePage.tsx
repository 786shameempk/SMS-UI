import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ChevronLeft, ChevronRight, ClipboardCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { changeSession, createSessions, deleteSession, getAttendanceSummary, listActivities, listSessions, saveSessionAttendance, updateSession } from "../api";
import { AttendanceDialog, CancelSessionDialog, SessionFormDialog } from "../components/SessionDialogs";
import { SelectField, formatDate, formatTime, useApiMutation, useExtracurricularAccess } from "../shared";
import type { Session } from "../types";

type View = "list" | "week" | "attendance";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
const startOfWeek = (d: Date) => addDays(d, -((d.getDay() + 6) % 7));

export default function SchedulePage() {
  const access = useExtracurricularAccess();
  const [view, setView] = useState<View>("week");
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [activityId, setActivityId] = useState<string | undefined>();
  const [mineOnly, setMineOnly] = useState(false);
  const [editing, setEditing] = useState<Session | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [cancelling, setCancelling] = useState<Session | null>(null);
  const [marking, setMarking] = useState<Session | null>(null);

  const activities = useQuery({ queryKey: ["extracurricular", "activity-names"], queryFn: () => listActivities({ pageSize: 200 }), enabled: !access.isFamily });
  const from = view === "list" ? iso(new Date()) : iso(weekStart);
  const to = view === "list" ? iso(addDays(new Date(), 60)) : iso(addDays(weekStart, 6));
  const filters = { from, to, activityId, mineOnly, pageSize: 300 };
  const sessions = useQuery({ queryKey: ["extracurricular", "sessions", filters], queryFn: () => listSessions(filters), enabled: view !== "attendance", placeholderData: (p) => p });
  const summary = useQuery({ queryKey: ["extracurricular", "attendance-summary", activityId], queryFn: () => getAttendanceSummary({ activityId }), enabled: view === "attendance" });

  const save = useApiMutation((input: Parameters<typeof createSessions>[0]) => (editing ? updateSession(editing.id, input) : createSessions(input)), {
    success: (r) => (editing ? "Session saved" : r.length > 1 ? `${r.length} sessions created` : "Session created"),
    onSuccess: () => setFormOpen(false),
  });
  const cancel = useApiMutation(({ id, reason }: { id: string; reason: string }) => changeSession(id, "Cancel", reason), { success: "Session cancelled", onSuccess: () => setCancelling(null) });
  const reinstate = useApiMutation((id: string) => changeSession(id, "Reinstate"), { success: "Session reinstated" });
  const complete = useApiMutation((id: string) => changeSession(id, "Complete"), { success: "Session marked completed" });
  const remove = useApiMutation(deleteSession, { success: "Session deleted" });
  const attendance = useApiMutation(({ id, marks }: { id: string; marks: Parameters<typeof saveSessionAttendance>[1] }) => saveSessionAttendance(id, marks), {
    success: (r) => `Attendance saved for ${r.saved} students`,
    onSuccess: () => setMarking(null),
  });

  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const items = sessions.data?.items ?? [];

  const SessionCard = ({ s }: { s: Session }) => (
    <div className={`rounded-lg border px-3 py-2 text-sm ${s.status === "Cancelled" ? "border-border bg-secondary/40 opacity-70" : "border-border bg-card"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className={`truncate font-medium ${s.status === "Cancelled" ? "line-through" : ""}`}>{s.title}</p>
          <p className="truncate text-xs text-muted-foreground">
            {s.activityName}
            {s.teamName ? ` · ${s.teamName}` : ""}
          </p>
        </div>
        {s.status !== "Scheduled" && <StatusBadge status={s.status} label={s.status === "Cancelled" ? "Cancelled" : "Done"} />}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {formatTime(s.startTime)}–{formatTime(s.endTime)}
        {s.venue ? ` · ${s.venue}` : ""}
        {s.instructorName ? ` · ${s.instructorName}` : ""}
      </p>
      {s.cancelReason && <p className="mt-1 text-xs text-destructive-strong">Cancelled: {s.cancelReason}</p>}
      {!access.isFamily && (
        <div className="mt-2 flex flex-wrap gap-1">
          {s.status !== "Cancelled" && (
            <Button size="sm" variant="outline" onClick={() => setMarking(s)}>
              <ClipboardCheck className="h-3.5 w-3.5" /> {s.marked > 0 ? `Register (${s.marked}/${s.expected})` : "Take register"}
            </Button>
          )}
          {access.canManage && s.status === "Scheduled" && (
            <>
              <Button size="sm" variant="ghost" onClick={() => { setEditing(s); setFormOpen(true); }}>Reschedule</Button>
              <Button size="sm" variant="ghost" onClick={() => setCancelling(s)}>Cancel</Button>
              <Button size="sm" variant="ghost" onClick={() => complete.mutate(s.id)}>Complete</Button>
            </>
          )}
          {access.canManage && s.status === "Cancelled" && (
            <>
              <Button size="sm" variant="ghost" onClick={() => reinstate.mutate(s.id)}>Reinstate</Button>
              <Button size="sm" variant="ghost" onClick={() => remove.mutate(s.id)}>Delete</Button>
            </>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <SegmentedControl
          aria-label="Schedule view"
          value={view}
          onValueChange={setView}
          options={[
            { value: "week", label: "Week" },
            { value: "list", label: "Upcoming" },
            ...(access.isFamily ? [] : [{ value: "attendance" as const, label: "Attendance summary" }]),
          ]}
        />
        {view === "week" && (
          <div className="flex items-center gap-1">
            <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Previous week" onClick={() => setWeekStart(addDays(weekStart, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="min-w-40 text-center text-sm">
              {formatDate(iso(weekStart))} – {formatDate(iso(addDays(weekStart, 6)))}
            </span>
            <Button size="icon" variant="outline" className="h-8 w-8" aria-label="Next week" onClick={() => setWeekStart(addDays(weekStart, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setWeekStart(startOfWeek(new Date()))}>
              Today
            </Button>
          </div>
        )}
        {!access.isFamily && (
          <div className="w-56">
            <SelectField value={activityId} onChange={setActivityId} allLabel="All activities" items={(activities.data?.items ?? []).map((a) => ({ value: a.id, label: a.name }))} />
          </div>
        )}
        {!access.isFamily && view !== "attendance" && (
          <Button variant={mineOnly ? "default" : "outline"} aria-pressed={mineOnly} onClick={() => setMineOnly(!mineOnly)}>
            My sessions
          </Button>
        )}
        {access.canManage && (
          <Button className="ml-auto" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <CalendarPlus className="h-4 w-4" /> New session
          </Button>
        )}
      </div>

      {sessions.isError && view !== "attendance" && <ErrorState onRetry={() => sessions.refetch()} retrying={sessions.isFetching} />}
      {sessions.isLoading && view !== "attendance" && <Skeleton className="h-48 w-full" />}

      {view === "week" && sessions.data && (
        <div className="grid gap-3 md:grid-cols-7">
          {days.map((d) => {
            const daySessions = items.filter((s) => s.date === iso(d));
            const today = iso(d) === iso(new Date());
            return (
              <div key={iso(d)} className="min-w-0 space-y-2">
                <p className={`text-xs font-semibold uppercase tracking-wide ${today ? "text-primary" : "text-muted-foreground"}`}>
                  {d.toLocaleDateString(undefined, { weekday: "short" })} {d.getDate()}
                </p>
                {daySessions.length === 0 ? <p className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">Free</p> : daySessions.map((s) => <SessionCard key={s.id} s={s} />)}
              </div>
            );
          })}
        </div>
      )}

      {view === "list" && sessions.data && (items.length === 0 ? <EmptyState title="Nothing in the next 60 days" description={access.canManage ? "Create a session to get started." : undefined} /> : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {items.map((s) => (
            <div key={s.id} className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{formatDate(s.date)}</p>
              <SessionCard s={s} />
            </div>
          ))}
        </div>
      ))}

      {view === "attendance" && (
        <Card>
          <CardContent className="p-0">
            {summary.isLoading && <Skeleton className="m-4 h-32" />}
            {summary.isError && <ErrorState onRetry={() => summary.refetch()} retrying={summary.isFetching} />}
            {summary.data && summary.data.length === 0 && <EmptyState bare title="No attendance recorded yet" description="Take a register from a session and the totals appear here." />}
            {summary.data && summary.data.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2">Student</th>
                      <th className="px-3 py-2 text-right">Sessions</th>
                      <th className="px-3 py-2 text-right">Present</th>
                      <th className="px-3 py-2 text-right">Late</th>
                      <th className="px-3 py-2 text-right">Excused</th>
                      <th className="px-3 py-2 text-right">Absent</th>
                      <th className="px-3 py-2 text-right">Attendance</th>
                      <th className="px-3 py-2 text-right">Hours</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {summary.data.map((r) => (
                      <tr key={r.studentId}>
                        <td className="px-3 py-2 font-medium">{r.studentName}</td>
                        <td className="px-3 py-2 text-right">{r.sessions}</td>
                        <td className="px-3 py-2 text-right">{r.present}</td>
                        <td className="px-3 py-2 text-right">{r.late}</td>
                        <td className="px-3 py-2 text-right">{r.excused}</td>
                        <td className="px-3 py-2 text-right">{r.absent}</td>
                        <td className={`px-3 py-2 text-right font-medium ${r.percentage < 75 ? "text-destructive-strong" : ""}`}>{r.percentage}%</td>
                        <td className="px-3 py-2 text-right">{r.hours}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
      {view === "attendance" && <p className="text-xs text-muted-foreground">Excused absences do not count against a student. Hours count the sessions a student was present or late for.</p>}

      <SessionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        session={editing}
        activities={(activities.data?.items ?? []).filter((a) => a.status === "Active" || a.id === editing?.activityId)}
        submitting={save.isPending}
        onSubmit={async (input) => {
          await save.mutateAsync(input).catch(() => undefined);
        }}
      />
      <CancelSessionDialog
        session={cancelling}
        onOpenChange={(v) => !v && setCancelling(null)}
        submitting={cancel.isPending}
        onSubmit={async (reason) => {
          if (cancelling) await cancel.mutateAsync({ id: cancelling.id, reason }).catch(() => undefined);
        }}
      />
      <AttendanceDialog
        session={marking}
        onOpenChange={(v) => !v && setMarking(null)}
        submitting={attendance.isPending}
        readOnly={!access.canTakeAttendance}
        onSubmit={async (marks) => {
          if (marking) await attendance.mutateAsync({ id: marking.id, marks }).catch(() => undefined);
        }}
      />
    </div>
  );
}
