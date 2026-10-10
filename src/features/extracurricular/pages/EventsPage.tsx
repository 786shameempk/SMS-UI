import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarPlus, ListChecks, Medal, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { deleteEvent, listEvents, listGroups, listRegistrations, listResults, listTeams, registerForEvent, saveEvent, saveResults, unregister } from "../api";
import { EVENT_STATUS_LABEL, LEVELS, PARTICIPANT_LABEL } from "../constants";
import { SelectField, formatDate, options, todayIso, useApiMutation, useExtracurricularAccess, useStudentOptions } from "../shared";
import type { ActivityEvent, EventResult, EventStatus, ParticipantType } from "../types";

export default function EventsPage() {
  const access = useExtracurricularAccess();
  const [status, setStatus] = useState<EventStatus | undefined>();
  const [editing, setEditing] = useState<ActivityEvent | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [registering, setRegistering] = useState<ActivityEvent | null>(null);
  const [scoring, setScoring] = useState<ActivityEvent | null>(null);
  const [removing, setRemoving] = useState<ActivityEvent | null>(null);

  const events = useQuery({ queryKey: ["extracurricular", "events", status], queryFn: () => listEvents({ status, pageSize: 100 }) });
  const remove = useApiMutation(deleteEvent, { success: "Event deleted", onSuccess: () => setRemoving(null) });
  const items = events.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-48">
          <SelectField value={status} onChange={setStatus} allLabel="Any status" items={options(EVENT_STATUS_LABEL)} />
        </div>
        {access.canManage && (
          <Button className="ml-auto" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <CalendarPlus className="h-4 w-4" /> New event
          </Button>
        )}
      </div>

      {events.isError && <ErrorState onRetry={() => events.refetch()} retrying={events.isFetching} />}
      {events.isLoading && <Skeleton className="h-40 w-full" />}
      {events.data && items.length === 0 && <EmptyState icon={Medal} title="No events" description={access.canManage ? "Sports days, festivals, tournaments, exhibitions — add the first one." : "No events are published yet."} />}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((e) => (
          <Card key={e.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{e.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{e.eventType}{e.level ? ` · ${e.level}` : ""}</p>
                </div>
                <StatusBadge status={e.status} label={EVENT_STATUS_LABEL[e.status]} />
              </div>
              <dl className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <dt>When</dt>
                <dd className="text-right text-foreground">{formatDate(e.startDate)}{e.endDate !== e.startDate ? ` – ${formatDate(e.endDate)}` : ""}</dd>
                {e.venue && (<><dt>Where</dt><dd className="truncate text-right text-foreground">{e.venue}</dd></>)}
                {e.organizer && (<><dt>Organiser</dt><dd className="truncate text-right text-foreground">{e.organizer}</dd></>)}
                {e.registrationDeadline && (<><dt>Register by</dt><dd className="text-right text-foreground">{formatDate(e.registrationDeadline)}</dd></>)}
                <dt>Registered</dt>
                <dd className="text-right text-foreground">{e.registrations}</dd>
              </dl>
              {e.description && <p className="line-clamp-2 text-sm text-secondary-foreground">{e.description}</p>}
              <div className="flex flex-wrap items-center gap-1">
                <Button size="sm" variant={e.registrationOpen ? "default" : "outline"} onClick={() => setRegistering(e)}>
                  <ListChecks className="h-3.5 w-3.5" /> {e.registrationOpen ? "Register" : "Registrations"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setScoring(e)}>
                  <Medal className="h-3.5 w-3.5" /> Results
                </Button>
                {access.canManage && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(e); setFormOpen(true); }}>Edit</Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${e.name}`} onClick={() => setRemoving(e)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive-strong" />
                    </Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <EventFormDialog open={formOpen} onOpenChange={setFormOpen} event={editing} />
      <RegistrationsDialog event={registering} onOpenChange={(o) => !o && setRegistering(null)} canManage={access.canManage} isFamily={access.isFamily} />
      <ResultsDialog event={scoring} onOpenChange={(o) => !o && setScoring(null)} canManage={access.canManage} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Delete event"
        description={`Delete "${removing?.name}" and its registrations? An event with recorded results can only be cancelled.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => {
          if (removing) remove.mutate(removing.id);
        }}
      />
    </div>
  );
}

function EventFormDialog({ open, onOpenChange, event }: { open: boolean; onOpenChange: (o: boolean) => void; event: ActivityEvent | null }) {
  const blank = () => ({ name: "", eventType: "", startDate: todayIso(), endDate: todayIso(), venue: "", organizer: "", registrationDeadline: "", level: "", description: "", status: "Draft" as EventStatus });
  const [v, setV] = useState(blank());
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setV(event ? { name: event.name, eventType: event.eventType, startDate: event.startDate, endDate: event.endDate, venue: event.venue ?? "", organizer: event.organizer ?? "", registrationDeadline: event.registrationDeadline ?? "", level: event.level ?? "", description: event.description ?? "", status: event.status } : blank());
  }, [open, event]);
  const save = useApiMutation(saveEvent, { success: "Event saved", onSuccess: () => onOpenChange(false) });
  const set = <K extends keyof ReturnType<typeof blank>>(k: K, x: ReturnType<typeof blank>[K]) => setV((s) => ({ ...s, [k]: x }));
  const errors = {
    name: !v.name.trim() ? "Name is required" : undefined,
    eventType: !v.eventType.trim() ? "Say what kind of event it is" : undefined,
    endDate: v.endDate < v.startDate ? "The event cannot end before it starts" : undefined,
    registrationDeadline: v.registrationDeadline && v.registrationDeadline > v.endDate ? "Registration must close by the end of the event" : undefined,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{event ? "Edit event" : "New event"}</DialogTitle>
          <DialogDescription>Families only see an event once it is no longer a draft.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (Object.values(errors).some(Boolean)) return; save.mutate({ id: event?.id, name: v.name.trim(), eventType: v.eventType.trim(), activityId: event?.activityId ?? null, startDate: v.startDate, endDate: v.endDate, venue: v.venue.trim() || null, organizer: v.organizer.trim() || null, registrationDeadline: v.registrationDeadline || null, level: v.level || null, description: v.description.trim() || null, status: v.status }); }}>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="ev-name" required error={touched ? errors.name : undefined}>
              <Input id="ev-name" value={v.name} onChange={(e) => set("name", e.target.value)} aria-invalid={touched && errors.name ? true : undefined} />
            </FormField>
            <FormField label="Kind of event" htmlFor="ev-type" required error={touched ? errors.eventType : undefined} hint="Sports Day, Arts Festival, Tournament…">
              <Input id="ev-type" value={v.eventType} onChange={(e) => set("eventType", e.target.value)} aria-invalid={touched && errors.eventType ? true : undefined} />
            </FormField>
            <FormField label="Starts" htmlFor="ev-start" required>
              <Input id="ev-start" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} />
            </FormField>
            <FormField label="Ends" htmlFor="ev-end" required error={touched ? errors.endDate : undefined}>
              <Input id="ev-end" type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} />
            </FormField>
            <FormField label="Register by" htmlFor="ev-deadline" optional error={touched ? errors.registrationDeadline : undefined}>
              <Input id="ev-deadline" type="date" value={v.registrationDeadline} onChange={(e) => set("registrationDeadline", e.target.value)} />
            </FormField>
            <FormField label="Level" htmlFor="ev-level" optional>
              <SelectField id="ev-level" value={v.level || undefined} onChange={(x) => set("level", x ?? "")} allLabel="Not set" items={LEVELS.map((l) => ({ value: l, label: l }))} />
            </FormField>
            <FormField label="Venue" htmlFor="ev-venue" optional>
              <Input id="ev-venue" value={v.venue} onChange={(e) => set("venue", e.target.value)} />
            </FormField>
            <FormField label="Organiser" htmlFor="ev-org" optional>
              <Input id="ev-org" value={v.organizer} onChange={(e) => set("organizer", e.target.value)} />
            </FormField>
          </div>
          <FormField label="Status" htmlFor="ev-status" hint="Open lets families register until the deadline.">
            <SelectField id="ev-status" value={v.status} onChange={(x) => x && set("status", x)} items={options(EVENT_STATUS_LABEL)} />
          </FormField>
          <FormField label="Description" htmlFor="ev-desc" optional>
            <Textarea id="ev-desc" rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} />
          </FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{event ? "Save changes" : "Create event"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RegistrationsDialog({ event, onOpenChange, canManage, isFamily }: { event: ActivityEvent | null; onOpenChange: (o: boolean) => void; canManage: boolean; isFamily: boolean }) {
  const regs = useQuery({ queryKey: ["extracurricular", "registrations", event?.id], queryFn: () => listRegistrations(event!.id), enabled: Boolean(event) });
  const students = useStudentOptions(Boolean(event));
  const teams = useQuery({ queryKey: ["extracurricular", "teams", "all", undefined], queryFn: () => listTeams(undefined, true), enabled: Boolean(event) && canManage });
  const groups = useQuery({ queryKey: ["extracurricular", "groups", "any"], queryFn: () => listGroups(), enabled: Boolean(event) && canManage });
  const [type, setType] = useState<ParticipantType>("Student");
  const [participant, setParticipant] = useState<string | null>(null);

  useEffect(() => setParticipant(null), [event?.id, type]);

  const add = useApiMutation(() => registerForEvent(event!.id, type, participant!), { success: "Registered", onSuccess: () => setParticipant(null) });
  const drop = useApiMutation(unregister, { success: "Registration withdrawn" });

  const choices = type === "Student" ? students.options : type === "Team" ? (teams.data ?? []).map((t) => ({ value: t.id, label: t.name, hint: t.activityName })) : (groups.data ?? []).map((g) => ({ value: g.id, label: g.name, hint: g.academicYear }));
  const typeItems = isFamily ? options({ Student: "Student" } as Record<ParticipantType, string>) : options(PARTICIPANT_LABEL);
  const mayRegister = Boolean(event?.registrationOpen);

  return (
    <Dialog open={Boolean(event)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{event?.name}</DialogTitle>
          <DialogDescription>
            {event && EVENT_STATUS_LABEL[event.status]}
            {event?.registrationDeadline ? ` · register by ${formatDate(event.registrationDeadline)}` : ""}
          </DialogDescription>
        </DialogHeader>
        {regs.isLoading && <Skeleton className="h-24 w-full" />}
        {regs.data && regs.data.length === 0 && <EmptyState size="sm" bare title="Nobody registered yet" />}
        <ul className="divide-y divide-border rounded-lg border border-border text-sm empty:hidden">
          {regs.data?.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <span>{r.participantName} <Badge variant="neutral">{PARTICIPANT_LABEL[r.participantType]}</Badge></span>
              {(canManage || isFamily) && event?.registrationOpen && <Button size="sm" variant="ghost" onClick={() => drop.mutate(r.id)}>Withdraw</Button>}
            </li>
          ))}
        </ul>
        {mayRegister ? (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">Register</p>
            <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
              {!isFamily && <SelectField value={type} onChange={(v) => v && setType(v)} items={typeItems} />}
              <Combobox aria-label="Participant" value={participant} onValueChange={setParticipant} options={choices} placeholder="Choose…" />
            </div>
            <Button type="button" disabled={!participant} loading={add.isPending} onClick={() => add.mutate(undefined)}>Register</Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Registration is closed.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Row = { key: string; participantType: ParticipantType; participantName: string; participantId?: string | null; round: string; score: string; rank: string; award: string };

function ResultsDialog({ event, onOpenChange, canManage }: { event: ActivityEvent | null; onOpenChange: (o: boolean) => void; canManage: boolean }) {
  const results = useQuery({ queryKey: ["extracurricular", "results", event?.id], queryFn: () => listResults(event!.id), enabled: Boolean(event) });
  const regs = useQuery({ queryKey: ["extracurricular", "registrations", event?.id], queryFn: () => listRegistrations(event!.id), enabled: Boolean(event) && canManage });
  const [rows, setRows] = useState<Row[]>([]);
  const [rankByScore, setRankByScore] = useState(true);
  const [errors, setErrors] = useState<string | null>(null);

  useEffect(() => {
    setErrors(null);
    setRows((results.data ?? []).map((r, i) => ({ key: `${r.id ?? i}`, participantType: r.participantType, participantName: r.participantName, participantId: r.participantId, round: r.round ?? "", score: r.score?.toString() ?? "", rank: r.rank?.toString() ?? "", award: r.award ?? "" })));
  }, [results.data, event?.id]);

  const save = useApiMutation(
    () =>
      saveResults(
        event!.id,
        rows.map((r): EventResult => ({ participantType: r.participantType, participantId: r.participantId ?? null, participantName: r.participantName.trim(), round: r.round.trim() || null, score: r.score ? Number(r.score) : null, rank: r.rank ? Number(r.rank) : null, award: r.award.trim() || null })),
        rankByScore,
      ),
    { success: "Results saved" },
  );

  const addFromRegistrations = () => {
    const have = new Set(rows.map((r) => r.participantName));
    setRows((s) => [...s, ...(regs.data ?? []).filter((r) => !have.has(r.participantName)).map((r, i) => ({ key: `new-${Date.now()}-${i}`, participantType: r.participantType, participantName: r.participantName, participantId: r.participantId, round: "", score: "", rank: "", award: "" }))]);
  };
  const update = (key: string, patch: Partial<Row>) => setRows((s) => s.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const submit = () => {
    const bad = rows.find((r) => !r.participantName.trim() || (r.score && Number.isNaN(Number(r.score))) || (r.rank && (!/^\d+$/.test(r.rank) || Number(r.rank) < 1)));
    if (bad) return setErrors("Every row needs a name, a numeric score and a rank of 1 or more.");
    setErrors(null);
    save.mutate(undefined);
  };

  return (
    <Dialog open={Boolean(event)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Results — {event?.name}</DialogTitle>
          <DialogDescription>Scores, ranks and awards by round. Saving a round replaces that round's results.</DialogDescription>
        </DialogHeader>
        {results.isLoading && <Skeleton className="h-32 w-full" />}
        {!canManage && rows.length === 0 && results.data && <EmptyState size="sm" bare title="No results yet" />}
        {rows.length > 0 && (
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-2 py-2">Participant</th><th className="px-2 py-2">Round</th><th className="px-2 py-2">Score</th><th className="px-2 py-2">Rank</th><th className="px-2 py-2">Award</th>{canManage && <th />}</tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.key}>
                    <td className="px-2 py-1.5">{canManage ? <Input aria-label="Participant" value={r.participantName} onChange={(e) => update(r.key, { participantName: e.target.value })} /> : r.participantName}</td>
                    <td className="px-2 py-1.5">{canManage ? <Input aria-label="Round" value={r.round} onChange={(e) => update(r.key, { round: e.target.value })} className="w-28" /> : r.round}</td>
                    <td className="px-2 py-1.5">{canManage ? <Input aria-label="Score" inputMode="decimal" value={r.score} onChange={(e) => update(r.key, { score: e.target.value })} className="w-20" /> : r.score}</td>
                    <td className="px-2 py-1.5">{canManage ? <Input aria-label="Rank" inputMode="numeric" value={r.rank} onChange={(e) => update(r.key, { rank: e.target.value })} className="w-16" /> : r.rank}</td>
                    <td className="px-2 py-1.5">{canManage ? <Input aria-label="Award" value={r.award} onChange={(e) => update(r.key, { award: e.target.value })} className="w-28" /> : r.award}</td>
                    {canManage && <td className="px-2"><Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Remove row" onClick={() => setRows((s) => s.filter((x) => x.key !== r.key))}><Trash2 className="h-3.5 w-3.5" /></Button></td>}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {canManage && (
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={addFromRegistrations}><Plus className="h-3.5 w-3.5" /> Add registered participants</Button>
            <Button type="button" size="sm" variant="outline" onClick={() => setRows((s) => [...s, { key: `blank-${Date.now()}`, participantType: "Student", participantName: "", round: "", score: "", rank: "", award: "" }])}><Plus className="h-3.5 w-3.5" /> Add a row</Button>
            <label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={rankByScore} onChange={(e) => setRankByScore(e.target.checked)} /> Rank by score when no rank is given</label>
          </div>
        )}
        {errors && <p role="alert" className="text-sm text-destructive-strong">{errors}</p>}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          {canManage && <Button type="button" loading={save.isPending} disabled={rows.length === 0} onClick={submit}>Save results</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
