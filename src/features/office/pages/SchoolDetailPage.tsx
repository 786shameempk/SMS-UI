import { useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, Download, FilePlus2, Flag, Mail, MessageSquarePlus, School, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorBanner } from "../components/kit";
import { Fact, Field, ReasonDialog, StatusBadge } from "../components/salesKit";
import { SchoolAdminsTab } from "../components/SchoolAdminsTab";
import {
  addSchoolNote,
  addSchoolTask,
  assignSchoolOwner,
  getSchool,
  markSchoolLost,
  reopenSchool,
  resendAdminInvite,
  schoolDocuments,
  schoolEvents,
  schoolSubscription,
  schoolTasks,
  setSchoolBlocker,
  setSchoolStage,
  startTrial,
  updateSchoolTask,
  uploadSchoolDocument,
} from "../api/sales";
import { sellablePlans } from "../api/plans";
import { listOfficeUsers } from "../api/team";
import { officeHttp } from "../api/http";
import { ago, day, errorText, money } from "../helpers";
import { useHasOfficePermission } from "../store";
import { MANUAL_STAGES, ONBOARDING_STAGES } from "../onboarding";

type OpenDialog = "stage" | "blocker" | "lost" | "trial" | "task" | "note" | null;

export default function SchoolDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const canManage = useHasOfficePermission("schools.manage");
  const canAssign = useHasOfficePermission("onboarding.manage");
  const canControl = useHasOfficePermission("tenants.control");
  const [open, setOpen] = useState<OpenDialog>(null);
  const [error, setError] = useState<string | null>(null);
  const key = ["office", "school", id];
  const school = useQuery({ queryKey: key, queryFn: () => getSchool(id) });
  const refresh = () => qc.invalidateQueries({ queryKey: ["office"] });
  const close = () => {
    setOpen(null);
    setError(null);
  };
  const run = <T,>(fn: (v: T) => Promise<unknown>, done: string) => ({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(done);
      close();
      void refresh();
    },
    onError: (e: unknown) => setError(errorText(e)),
  });

  const reopen = useMutation(run(() => reopenSchool(id), "School reopened."));
  const invite = useMutation(run(() => resendAdminInvite(id), "Invitation sent."));
  const owner = useMutation(run((ownerId: string | null) => assignSchoolOwner(id, ownerId), "Owner updated."));
  const stage = useMutation(run((v: { stage: number; note: string | null }) => setSchoolStage(id, v.stage, v.note), "Stage updated."));
  const blocker = useMutation(run((v: { blocker: string | null; due: string | null }) => setSchoolBlocker(id, v.blocker, v.due), "Blocker updated."));
  const lost = useMutation(run((reason: string) => markSchoolLost(id, reason), "School closed as lost."));

  if (school.isLoading) return <PageContainer><Skeleton className="h-64 rounded-xl" /></PageContainer>;
  if (school.isError || !school.data) return <PageContainer><ErrorState onRetry={() => school.refetch()} retrying={school.isRefetching} /></PageContainer>;
  const s = school.data;
  const isOpen = s.status === "Open";

  return (
    <PageContainer>
      <Link to="/office/schools" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All schools
      </Link>
      <PageHeader
        icon={School}
        title={s.schoolName}
        description={`${s.code} · ${s.subdomain}${s.city ? ` · ${s.city}` : ""}`}
        actions={
          canManage && (
            <div className="flex flex-wrap gap-2">
              {isOpen ? (
                <>
                  <Button variant="outline" onClick={() => setOpen("stage")}>Change stage</Button>
                  <Button variant="outline" onClick={() => setOpen("blocker")}><Flag className="h-4 w-4" aria-hidden="true" />Blocker</Button>
                  {!s.tenantId && <Button variant="outline" onClick={() => setOpen("trial")}>Start trial</Button>}
                  <Button asChild><Link to={`/office/plan-builder?school=${s.id}`}><FilePlus2 className="h-4 w-4" aria-hidden="true" />New quotation</Link></Button>
                  <Button variant="ghost" onClick={() => setOpen("lost")}>Mark lost</Button>
                </>
              ) : (
                <Button onClick={() => reopen.mutate()} loading={reopen.isPending}>Reopen</Button>
              )}
            </div>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
        <StatusBadge status={s.status} />
        <span className="font-medium">{`${s.stageNumber}. ${s.stage}`}</span>
        <span className="text-sm text-muted-foreground">since {ago(s.stageChangedAt)}</span>
        {s.blocker && <span className="rounded-md bg-destructive-soft px-2 py-0.5 text-sm text-destructive-strong">Blocked: {s.blocker}{s.dueDate ? ` (by ${day(s.dueDate)})` : ""}</span>}
        <div className="ms-auto flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">Owner</span>
          {canAssign && isOpen ? <OwnerPicker value={s.ownerUserId} name={s.ownerName} onChange={(v) => owner.mutate(v)} /> : <span>{s.ownerName ?? "Unassigned"}</span>}
        </div>
      </div>
      <Progress current={s.stageNumber} />

      <Tabs defaultValue="overview">
        <TabsList variant="line">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="subscription">Subscription</TabsTrigger>
          {s.tenantId && <TabsTrigger value="admins">Administrators</TabsTrigger>}
        </TabsList>
        <TabsContent value="overview" className="pt-4">
          <dl className="grid gap-4 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 lg:grid-cols-3">
            <Fact label="Board">{s.board}</Fact>
            <Fact label="Location">{[s.city, s.state, s.country].filter(Boolean).join(", ") || null}</Fact>
            <Fact label="Expected students">{s.expectedStudents}</Fact>
            <Fact label="Branches">{s.branches}</Fact>
            <Fact label="Contact">{[s.contactName, s.contactEmail, s.contactPhone].filter(Boolean).join(" · ") || null}</Fact>
            <Fact label="Billing contact">{[s.billingContactName, s.billingContactEmail].filter(Boolean).join(" · ") || null}</Fact>
            <Fact label="Tax ID">{s.taxId}</Fact>
            <Fact label="School tenant">{s.tenantId}</Fact>
            <Fact label="Administrator invitation">
              <span className="inline-flex items-center gap-2">
                <StatusBadge status={s.adminInvite} />
                {canManage && s.tenantId && s.adminInvite !== "Sent" && (
                  <Button size="sm" variant="outline" onClick={() => invite.mutate()} loading={invite.isPending}><Mail className="h-4 w-4" aria-hidden="true" />Send</Button>
                )}
              </span>
            </Fact>
          </dl>
          {s.internalNotes && <p className="mt-3 whitespace-pre-wrap rounded-xl border border-border bg-card p-4 text-sm">{s.internalNotes}</p>}
        </TabsContent>
        <TabsContent value="tasks" className="pt-4"><TasksTab schoolId={id} canManage={canManage} onAdd={() => setOpen("task")} /></TabsContent>
        <TabsContent value="timeline" className="pt-4"><TimelineTab schoolId={id} canManage={canManage} onNote={() => setOpen("note")} /></TabsContent>
        <TabsContent value="documents" className="pt-4"><DocumentsTab schoolId={id} canManage={canManage} /></TabsContent>
        <TabsContent value="subscription" className="pt-4"><SubscriptionTab schoolId={id} /></TabsContent>
        {s.tenantId && <TabsContent value="admins" className="pt-4"><SchoolAdminsTab schoolId={id} canControl={canControl} /></TabsContent>}
      </Tabs>

      {open === "stage" && <StageDialog current={s.stageNumber} busy={stage.isPending} error={error} onClose={close} onSave={(v) => stage.mutate(v)} />}
      {open === "blocker" && <BlockerDialog blocker={s.blocker} due={s.dueDate} busy={blocker.isPending} error={error} onClose={close} onSave={(v) => blocker.mutate(v)} />}
      <ReasonDialog open={open === "lost"} title="Mark as lost" description="The school leaves the active pipeline. It can be reopened later." confirmLabel="Mark lost" destructive busy={lost.isPending} error={error} onClose={close} onConfirm={(r) => lost.mutate(r)} />
      {open === "trial" && <TrialDialog schoolId={id} onClose={close} onDone={() => { close(); void refresh(); }} />}
      {open === "task" && <TaskDialog schoolId={id} onClose={close} onDone={() => { close(); void refresh(); }} />}
      {open === "note" && <NoteDialog schoolId={id} onClose={close} onDone={() => { close(); void refresh(); }} />}
    </PageContainer>
  );
}

function Progress({ current }: { current: number }) {
  return (
    <ol aria-label="Onboarding progress" className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {ONBOARDING_STAGES.map((label, i) => {
        const n = i + 1;
        const done = n <= current;
        return (
          <li key={label} aria-current={n === current ? "step" : undefined} className={`inline-flex items-center gap-1 ${n === current ? "font-semibold text-foreground" : done ? "text-success-strong" : "text-muted-foreground"}`}>
            {done ? <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> : <Circle className="h-3.5 w-3.5" aria-hidden="true" />}
            {n}. {label}
          </li>
        );
      })}
    </ol>
  );
}

function OwnerPicker({ value, name, onChange }: { value: string | null; name: string | null; onChange: (id: string | null) => void }) {
  const users = useQuery({ queryKey: ["office", "owner-candidates"], queryFn: () => listOfficeUsers({ status: "active", pageSize: 100 }) });
  return (
    <Select value={value ?? "none"} onValueChange={(v) => onChange(v === "none" ? null : v)}>
      <SelectTrigger className="w-48" aria-label="Owner">
        <SelectValue placeholder={name ?? "Unassigned"} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Unassigned</SelectItem>
        {users.data?.items.map((u) => <SelectItem key={u.id} value={u.id}>{u.displayName}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function StageDialog({ current, busy, error, onClose, onSave }: { current: number; busy: boolean; error: string | null; onClose: () => void; onSave: (v: { stage: number; note: string | null }) => void }) {
  const [stage, setStage] = useState(String(MANUAL_STAGES.find((n) => n !== current) ?? 2));
  const [note, setNote] = useState("");
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change stage</DialogTitle>
          <DialogDescription>Only the stages you complete by hand are listed. Quotation, purchase, payment, tenant and activation stages move when that work happens.</DialogDescription>
        </DialogHeader>
        <Select value={stage} onValueChange={setStage}>
          <SelectTrigger aria-label="New stage"><SelectValue /></SelectTrigger>
          <SelectContent>{MANUAL_STAGES.map((n) => <SelectItem key={n} value={String(n)}>{`${n}. ${ONBOARDING_STAGES[n - 1]}`}</SelectItem>)}</SelectContent>
        </Select>
        <Field label="Note (optional)"><Input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => onSave({ stage: Number(stage), note: note.trim() || null })} loading={busy}>Update stage</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BlockerDialog({ blocker, due, busy, error, onClose, onSave }: { blocker: string | null; due: string | null; busy: boolean; error: string | null; onClose: () => void; onSave: (v: { blocker: string | null; due: string | null }) => void }) {
  const [text, setText] = useState(blocker ?? "");
  const [date, setDate] = useState(due?.slice(0, 10) ?? "");
  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Blocker</DialogTitle>
          <DialogDescription>What is holding this school back. Leave it empty to clear the blocker.</DialogDescription>
        </DialogHeader>
        <Field label="Blocker"><Textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} maxLength={500} /></Field>
        <Field label="Expected resolution date"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={() => onSave({ blocker: text.trim() || null, due: date || null })} loading={busy}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TrialDialog({ schoolId, onClose, onDone }: { schoolId: string; onClose: () => void; onDone: () => void }) {
  const plans = useQuery({ queryKey: ["office", "sellable-plans"], queryFn: sellablePlans });
  const [planId, setPlanId] = useState("");
  const [days, setDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const start = useMutation({
    mutationFn: () => startTrial(schoolId, planId, days ? Number(days) : null),
    onSuccess: () => {
      toast.success("Trial started and the school was created.");
      onDone();
    },
    onError: (e) => setError(errorText(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !start.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Start a trial</DialogTitle>
          <DialogDescription>Creates the school's workspace for a limited time, limited by the plan's trial length. A purchase converts it.</DialogDescription>
        </DialogHeader>
        <Select value={planId} onValueChange={setPlanId}>
          <SelectTrigger aria-label="Trial plan"><SelectValue placeholder="Choose a plan" /></SelectTrigger>
          <SelectContent>{plans.data?.filter((p) => p.publishedVersion).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
        </Select>
        <Field label="Days (optional)"><Input type="number" min={1} value={days} onChange={(e) => setDays(e.target.value)} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={start.isPending}>Cancel</Button>
          <Button onClick={() => start.mutate()} loading={start.isPending} disabled={!planId}>Start trial</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TaskDialog({ schoolId, onClose, onDone }: { schoolId: string; onClose: () => void; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({
    mutationFn: () => addSchoolTask(schoolId, { title: title.trim(), assignedTo: null, dueDate: due || null }),
    onSuccess: onDone,
    onError: (e) => setError(errorText(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !add.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add a task</DialogTitle><DialogDescription>A follow-up for this school.</DialogDescription></DialogHeader>
        <Field label="Task"><Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} /></Field>
        <Field label="Due date"><Input type="date" value={due} onChange={(e) => setDue(e.target.value)} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={add.isPending}>Cancel</Button>
          <Button onClick={() => add.mutate()} loading={add.isPending} disabled={!title.trim()}>Add task</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function NoteDialog({ schoolId, onClose, onDone }: { schoolId: string; onClose: () => void; onDone: () => void }) {
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const add = useMutation({ mutationFn: () => addSchoolNote(schoolId, note.trim()), onSuccess: onDone, onError: (e) => setError(errorText(e)) });
  return (
    <Dialog open onOpenChange={(o) => !o && !add.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Add a note</DialogTitle><DialogDescription>Internal only; it appears on the timeline.</DialogDescription></DialogHeader>
        <Textarea aria-label="Note" rows={4} value={note} onChange={(e) => setNote(e.target.value)} maxLength={2000} />
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={add.isPending}>Cancel</Button>
          <Button onClick={() => add.mutate()} loading={add.isPending} disabled={!note.trim()}>Add note</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TasksTab({ schoolId, canManage, onAdd }: { schoolId: string; canManage: boolean; onAdd: () => void }) {
  const qc = useQueryClient();
  const tasks = useQuery({ queryKey: ["office", "school-tasks", schoolId], queryFn: () => schoolTasks(schoolId) });
  const toggle = useMutation({
    mutationFn: (t: { id: string; completed: boolean }) => updateSchoolTask(schoolId, t.id, { completed: t.completed }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["office"] }),
    onError: (e) => toast.error(errorText(e)),
  });
  if (tasks.isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (tasks.isError) return <ErrorState onRetry={() => tasks.refetch()} retrying={tasks.isRefetching} />;
  return (
    <div className="space-y-3">
      {canManage && <Button variant="outline" onClick={onAdd}><FilePlus2 className="h-4 w-4" aria-hidden="true" />Add task</Button>}
      {tasks.data!.length === 0 ? (
        <EmptyState title="No tasks yet" description="Add follow-ups to keep this school moving." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {tasks.data!.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-4 py-3">
              <input type="checkbox" aria-label={`Complete ${t.title}`} checked={!!t.completedAt} disabled={!canManage || toggle.isPending} onChange={(e) => toggle.mutate({ id: t.id, completed: e.target.checked })} />
              <div className="min-w-0 flex-1">
                <p className={t.completedAt ? "text-muted-foreground line-through" : "font-medium"}>{t.title}</p>
                <p className="text-xs text-muted-foreground">{[t.assignedToName, t.dueDate ? `due ${day(t.dueDate)}` : null].filter(Boolean).join(" · ")}</p>
              </div>
              {t.overdue && !t.completedAt && <StatusBadge status="Overdue">Overdue</StatusBadge>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function TimelineTab({ schoolId, canManage, onNote }: { schoolId: string; canManage: boolean; onNote: () => void }) {
  const events = useQuery({ queryKey: ["office", "school-events", schoolId], queryFn: () => schoolEvents(schoolId) });
  if (events.isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (events.isError) return <ErrorState onRetry={() => events.refetch()} retrying={events.isRefetching} />;
  return (
    <div className="space-y-3">
      {canManage && <Button variant="outline" onClick={onNote}><MessageSquarePlus className="h-4 w-4" aria-hidden="true" />Add note</Button>}
      <ol className="space-y-2">
        {events.data!.map((e) => (
          <li key={e.id} className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
            <p>{e.message}</p>
            <p className="text-xs text-muted-foreground">{e.kind} · {e.actorEmail ?? "system"} · {ago(e.occurredAt)}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}

function DocumentsTab({ schoolId, canManage }: { schoolId: string; canManage: boolean }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const docs = useQuery({ queryKey: ["office", "school-documents", schoolId], queryFn: () => schoolDocuments(schoolId) });
  const upload = useMutation({
    mutationFn: (file: File) => uploadSchoolDocument(schoolId, file, ""),
    onSuccess: () => {
      toast.success("Document uploaded.");
      void qc.invalidateQueries({ queryKey: ["office", "school-documents", schoolId] });
    },
    onError: (e) => toast.error(errorText(e)),
  });
  /** Downloads go through the authorised client, so the file is never reachable by a plain link. */
  const download = async (docId: string, name: string) => {
    try {
      const res = await officeHttp.get<Blob>(`schools/${schoolId}/documents/${docId}`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  if (docs.isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (docs.isError) return <ErrorState onRetry={() => docs.refetch()} retrying={docs.isRefetching} />;
  return (
    <div className="space-y-3">
      {canManage && (
        <>
          <input ref={input} type="file" hidden aria-label="Choose a document" accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.csv,.txt" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload.mutate(f); e.target.value = ""; }} />
          <Button variant="outline" onClick={() => input.current?.click()} loading={upload.isPending}><Upload className="h-4 w-4" aria-hidden="true" />Upload document</Button>
          <p className="text-xs text-muted-foreground">PDF, images, Word, Excel, CSV or text, up to 5 MB.</p>
        </>
      )}
      {docs.data!.length === 0 ? (
        <EmptyState title="No documents" description="Agreements, purchase orders and registration papers can be kept here." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {docs.data!.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.fileName}</p>
                <p className="text-xs text-muted-foreground">{(d.sizeBytes / 1024).toFixed(0)} KB · {ago(d.uploadedAt)}</p>
              </div>
              <Button size="sm" variant="ghost" aria-label={`Download ${d.fileName}`} onClick={() => download(d.id, d.fileName)}><Download className="h-4 w-4" aria-hidden="true" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function SubscriptionTab({ schoolId }: { schoolId: string }) {
  const sub = useQuery({ queryKey: ["office", "school-subscription", schoolId], queryFn: () => schoolSubscription(schoolId) });
  if (sub.isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (sub.isError) return <ErrorState onRetry={() => sub.refetch()} retrying={sub.isRefetching} />;
  if (!sub.data) return <EmptyState title="No subscription yet" description="A subscription is created when the first payment is verified, or when a trial starts." />;
  const x = sub.data;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <StatusBadge status={x.status} />
        <span className="font-medium">{x.planName} v{x.planVersion}</span>
        <span className="text-sm text-muted-foreground">{day(x.startDate)} – {day(x.endDate)} · renews at {money(x.renewalAmount, x.currency)}</span>
        <Button asChild size="sm" variant="outline" className="ms-auto"><Link to={`/office/subscriptions/${x.id}`}>Open subscription</Link></Button>
      </div>
    </div>
  );
}
