import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Users } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { deleteTeam, leaveTeam, listActivities, listEnrollments, listTeamMembers, listTeams, saveTeam, saveTeamMember } from "../api";
import { TEAM_ROLE_LABEL } from "../constants";
import { ColorDot, SelectField, options, useApiMutation, useExtracurricularAccess } from "../shared";
import type { Team, TeamRole } from "../types";

export default function TeamsPage() {
  const access = useExtracurricularAccess();
  const [activityId, setActivityId] = useState<string | undefined>();
  const [editing, setEditing] = useState<Team | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [roster, setRoster] = useState<Team | null>(null);
  const [removing, setRemoving] = useState<Team | null>(null);

  const activities = useQuery({ queryKey: ["extracurricular", "activity-names"], queryFn: () => listActivities({ pageSize: 200 }) });
  const teams = useQuery({ queryKey: ["extracurricular", "teams", "all", activityId], queryFn: () => listTeams(activityId, true) });
  const remove = useApiMutation(deleteTeam, { success: (r) => (r.removed ? "Team deleted" : "The team has history, so it was deactivated instead"), onSuccess: () => setRemoving(null) });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="w-60">
          <SelectField value={activityId} onChange={setActivityId} allLabel="All activities" items={(activities.data?.items ?? []).map((a) => ({ value: a.id, label: a.name }))} />
        </div>
        {access.canManage && (
          <Button className="ml-auto" onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> New team
          </Button>
        )}
      </div>

      {teams.isError && <ErrorState onRetry={() => teams.refetch()} retrying={teams.isFetching} />}
      {teams.isLoading && <Skeleton className="h-40 w-full" />}
      {teams.data && teams.data.length === 0 && <EmptyState icon={Users} title="No teams yet" description="Teams belong to an activity. You can have as many as you need for the same sport: age groups, levels, boys', girls', mixed." />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {teams.data?.map((t) => (
          <Card key={t.id} style={{ borderTop: `4px solid ${t.color}` }} className={t.isActive ? "" : "opacity-70"}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 truncate text-base font-semibold"><ColorDot color={t.color} /> {t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.activityName} · {t.code}</p>
                </div>
                {!t.isActive && <Badge variant="neutral">Inactive</Badge>}
              </div>
              {t.level && <Badge variant="info">{t.level}</Badge>}
              <dl className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                <dt>Squad</dt>
                <dd className="text-right text-foreground">{t.memberCount}{t.maxMembers ? ` / ${t.maxMembers}` : ""} + {t.substituteCount} subs</dd>
                <dt>Captain</dt>
                <dd className="truncate text-right text-foreground">{t.captain ?? "—"}</dd>
                <dt>Coach</dt>
                <dd className="truncate text-right text-foreground">{t.coachName ?? "—"}</dd>
              </dl>
              <div className="flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={() => setRoster(t)}>
                  <Users className="h-3.5 w-3.5" /> Squad
                </Button>
                {access.canManage && (
                  <div className="flex">
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(t); setFormOpen(true); }}>Edit</Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${t.name}`} onClick={() => setRemoving(t)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive-strong" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TeamFormDialog open={formOpen} onOpenChange={setFormOpen} team={editing} activities={activities.data?.items ?? []} defaultActivityId={activityId} />
      <RosterDialog team={roster} onOpenChange={(o) => !o && setRoster(null)} canManage={access.canManage} allTeams={teams.data ?? []} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Delete team"
        description={`Delete "${removing?.name}"? A team with members or sessions in its history is deactivated instead, so the record stays.`}
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

function TeamFormDialog({ open, onOpenChange, team, activities, defaultActivityId }: { open: boolean; onOpenChange: (o: boolean) => void; team: Team | null; activities: { id: string; name: string }[]; defaultActivityId?: string }) {
  const [v, setV] = useState({ activityId: "", name: "", code: "", color: "#3b82f6", level: "", coachName: "", maxMembers: "", description: "", isActive: true });
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setV(team ? { activityId: team.activityId, name: team.name, code: team.code, color: team.color, level: team.level ?? "", coachName: team.coachName ?? "", maxMembers: team.maxMembers?.toString() ?? "", description: team.description ?? "", isActive: team.isActive }
      : { activityId: defaultActivityId ?? activities[0]?.id ?? "", name: "", code: "", color: "#3b82f6", level: "", coachName: "", maxMembers: "", description: "", isActive: true });
  }, [open, team, defaultActivityId, activities]);

  const save = useApiMutation(saveTeam, { success: "Team saved", onSuccess: () => onOpenChange(false) });
  const set = <K extends keyof typeof v>(k: K, x: (typeof v)[K]) => setV((s) => ({ ...s, [k]: x }));
  const errors = {
    activityId: !v.activityId ? "Choose an activity" : undefined,
    name: !v.name.trim() ? "Name is required" : undefined,
    code: !v.code.trim() ? "Code is required" : undefined,
    maxMembers: v.maxMembers && (!/^\d+$/.test(v.maxMembers) || Number(v.maxMembers) < 1) ? "Enter a number of 1 or more" : undefined,
  };
  const invalid = Object.values(errors).some(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{team ? "Edit team" : "New team"}</DialogTitle>
          <DialogDescription>Name the team however the school does: "Under-14 Boys", "Junior Choir", "Robotics Beginners".</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (invalid) return; save.mutate({ id: team?.id, activityId: v.activityId, name: v.name.trim(), code: v.code.trim(), color: v.color, level: v.level.trim() || null, coachName: v.coachName.trim() || null, maxMembers: v.maxMembers ? Number(v.maxMembers) : null, description: v.description.trim() || null, isActive: v.isActive }); }}>
          <FormField label="Activity" htmlFor="tm-activity" required error={touched ? errors.activityId : undefined}>
            <SelectField id="tm-activity" value={v.activityId || undefined} onChange={(x) => set("activityId", x ?? "")} items={activities.map((a) => ({ value: a.id, label: a.name }))} placeholder="Choose an activity" disabled={Boolean(team)} />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Name" htmlFor="tm-name" required error={touched ? errors.name : undefined}>
              <Input id="tm-name" value={v.name} onChange={(e) => set("name", e.target.value)} aria-invalid={touched && errors.name ? true : undefined} />
            </FormField>
            <FormField label="Code" htmlFor="tm-code" required error={touched ? errors.code : undefined}>
              <Input id="tm-code" value={v.code} onChange={(e) => set("code", e.target.value)} aria-invalid={touched && errors.code ? true : undefined} />
            </FormField>
            <FormField label="Level or category" htmlFor="tm-level" optional hint="Under 14, Beginner, Girls, Mixed…">
              <Input id="tm-level" value={v.level} onChange={(e) => set("level", e.target.value)} />
            </FormField>
            <FormField label="Colour" htmlFor="tm-color">
              <Input id="tm-color" type="color" value={v.color} onChange={(e) => set("color", e.target.value)} className="h-9 p-1" />
            </FormField>
            <FormField label="Coach" htmlFor="tm-coach" optional>
              <Input id="tm-coach" value={v.coachName} onChange={(e) => set("coachName", e.target.value)} />
            </FormField>
            <FormField label="Squad size limit" htmlFor="tm-max" optional error={touched ? errors.maxMembers : undefined} hint="Substitutes are not counted">
              <Input id="tm-max" inputMode="numeric" value={v.maxMembers} onChange={(e) => set("maxMembers", e.target.value)} />
            </FormField>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
            <span className="font-medium">Active</span>
            <Switch checked={v.isActive} onCheckedChange={(x) => set("isActive", x)} aria-label="Active" />
          </label>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{team ? "Save changes" : "Create team"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function RosterDialog({ team, onOpenChange, canManage, allTeams }: { team: Team | null; onOpenChange: (o: boolean) => void; canManage: boolean; allTeams: Team[] }) {
  const members = useQuery({ queryKey: ["extracurricular", "team-members", team?.id], queryFn: () => listTeamMembers(team!.id, true), enabled: Boolean(team) });
  const eligible = useQuery({
    queryKey: ["extracurricular", "team-eligible", team?.activityId],
    queryFn: () => listEnrollments({ activityId: team!.activityId, status: "Approved", pageSize: 200 }),
    enabled: Boolean(team) && canManage,
  });
  const [studentId, setStudentId] = useState<string | null>(null);
  const [role, setRole] = useState<TeamRole>("Member");
  const [sub, setSub] = useState(false);
  const [position, setPosition] = useState("");
  const [jersey, setJersey] = useState("");

  useEffect(() => {
    setStudentId(null);
    setRole("Member");
    setSub(false);
    setPosition("");
    setJersey("");
  }, [team?.id]);

  const add = useApiMutation(
    () => saveTeamMember(team!.id, { studentId: studentId!, role, isSubstitute: sub, position: position.trim() || null, jerseyNumber: jersey ? Number(jersey) : null }),
    { success: "Added to the team", onSuccess: () => { setStudentId(null); setPosition(""); setJersey(""); setRole("Member"); setSub(false); } },
  );
  const leave = useApiMutation(({ id, to }: { id: string; to?: string }) => leaveTeam(id, to), { success: "Updated" });

  const current = (members.data ?? []).filter((m) => !m.leftOn);
  const former = (members.data ?? []).filter((m) => m.leftOn);
  const inTeam = new Set(current.map((m) => m.studentId));
  const choices = (eligible.data?.items ?? []).filter((e) => !inTeam.has(e.studentId)).map((e) => ({ value: e.studentId, label: e.studentName, hint: e.className ?? undefined }));
  const siblings = allTeams.filter((t) => team && t.activityId === team.activityId && t.id !== team.id && t.isActive);
  const jerseyError = jersey && (!/^\d+$/.test(jersey) || Number(jersey) > 999) ? "0 to 999" : undefined;

  return (
    <Dialog open={Boolean(team)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">{team && <ColorDot color={team.color} />} {team?.name}</DialogTitle>
          <DialogDescription>{team?.activityName} · only students enrolled in the activity can join.</DialogDescription>
        </DialogHeader>

        {members.isLoading && <Skeleton className="h-32 w-full" />}
        {members.isError && <ErrorState onRetry={() => members.refetch()} retrying={members.isFetching} />}
        {members.data && current.length === 0 && <EmptyState size="sm" bare title="No players yet" />}
        <ul className="divide-y divide-border rounded-lg border border-border empty:hidden">
          {current.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
              <span>
                <span className="font-medium">{m.studentName}</span>
                <span className="ml-2 text-xs text-muted-foreground">{m.className}{m.position ? ` · ${m.position}` : ""}{m.jerseyNumber != null ? ` · #${m.jerseyNumber}` : ""}</span>
              </span>
              <span className="flex items-center gap-1">
                {m.role !== "Member" && <Badge variant="brand">{TEAM_ROLE_LABEL[m.role]}</Badge>}
                {m.isSubstitute && <Badge variant="neutral">Substitute</Badge>}
                {canManage && (
                  <>
                    {siblings.length > 0 && (
                      <SelectField value={undefined} onChange={(to) => to && leave.mutate({ id: m.id, to })} placeholder="Transfer…" items={siblings.map((s) => ({ value: s.id, label: s.name }))} className="h-8 w-32 text-xs" />
                    )}
                    <Button size="sm" variant="ghost" onClick={() => leave.mutate({ id: m.id })}>Remove</Button>
                  </>
                )}
              </span>
            </li>
          ))}
        </ul>
        {former.length > 0 && <p className="text-xs text-muted-foreground">Former members kept as history: {former.map((m) => m.studentName).join(", ")}</p>}

        {canManage && (
          <div className="space-y-3 rounded-lg border border-border p-3">
            <p className="text-sm font-medium">Add a player</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Student" htmlFor="rs-student">
                <Combobox aria-label="Student" value={studentId} onValueChange={setStudentId} options={choices} placeholder={eligible.isLoading ? "Loading…" : choices.length ? "Choose a student" : "No enrolled students left"} />
              </FormField>
              <FormField label="Role" htmlFor="rs-role">
                <SelectField id="rs-role" value={role} onChange={(v) => v && setRole(v)} items={options(TEAM_ROLE_LABEL)} disabled={sub} />
              </FormField>
              <FormField label="Position" htmlFor="rs-position" optional>
                <Input id="rs-position" value={position} onChange={(e) => setPosition(e.target.value)} />
              </FormField>
              <FormField label="Jersey number" htmlFor="rs-jersey" optional error={jerseyError}>
                <Input id="rs-jersey" inputMode="numeric" value={jersey} onChange={(e) => setJersey(e.target.value)} />
              </FormField>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={sub} onCheckedChange={(c) => { setSub(c === true); if (c === true) setRole("Member"); }} aria-label="Substitute" /> Substitute (not counted against the squad limit)
            </label>
            <Button type="button" disabled={!studentId || Boolean(jerseyError)} loading={add.isPending} onClick={() => add.mutate(undefined)}>Add to team</Button>
          </div>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
