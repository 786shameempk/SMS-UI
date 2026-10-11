import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, BadgeCheck, CalendarClock, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FormErrorBanner } from "../components/kit";
import { EndOfLifePanel } from "../components/EndOfLifePanel";
import { ConfirmDialog } from "../components/kit";
import { Fact, Field, ReasonDialog, StatusBadge } from "../components/salesKit";
import { addOverride, cancelScheduledChange, getSubscription, listQuotations, removeOverride, resyncSubscription, scheduleChange, subscriptionAction } from "../api/sales";
import { getCatalog } from "../api/plans";
import { dateTime, day, errorText, money } from "../helpers";
import { useHasOfficePermission } from "../store";
import type { Entitlements, Subscription } from "../salesTypes";

type Mode = "view" | "suspend" | "reactivate" | "cancel" | "override" | "schedule" | "renew" | "activate" | "resync";

export default function SubscriptionDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const canManage = useHasOfficePermission("subscriptions.manage");
  const canControl = useHasOfficePermission("tenants.control");
  const canEntitle = useHasOfficePermission("entitlements.manage");
  const canOverridePolicy = useHasOfficePermission("payments.verify");
  const canDelete = useHasOfficePermission("tenants.delete");
  const [mode, setMode] = useState<Mode>("view");
  const [error, setError] = useState<string | null>(null);
  const sub = useQuery({ queryKey: ["office", "subscription", id], queryFn: () => getSubscription(id) });
  const done = (msg: string) => {
    toast.success(msg);
    setMode("view");
    setError(null);
    void qc.invalidateQueries({ queryKey: ["office"] });
  };
  const act = useMutation({
    mutationFn: (v: { action: Parameters<typeof subscriptionAction>[1]; reason?: string; overridePolicy?: boolean }) => subscriptionAction(id, v.action, { reason: v.reason, overridePolicy: v.overridePolicy }),
    onSuccess: (_s, v) => done(`Subscription ${{ activate: "activated", renew: "renewal invoiced", suspend: "suspended", reactivate: "reactivated", cancel: "cancelled" }[v.action]}.`),
    onError: (e) => setError(errorText(e)),
  });

  if (sub.isLoading) return <PageContainer><Skeleton className="h-64 rounded-xl" /></PageContainer>;
  if (sub.isError || !sub.data) return <PageContainer><ErrorState onRetry={() => sub.refetch()} retrying={sub.isRefetching} /></PageContainer>;
  const s = sub.data;
  const can = (to: string) => s.allowedMoves.includes(to);
  const close = () => { setMode("view"); setError(null); };

  return (
    <PageContainer>
      <Link to="/office/subscriptions" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All subscriptions
      </Link>
      <PageHeader
        icon={BadgeCheck}
        title={s.schoolName}
        description={`${s.planName} v${s.planVersion} · ${s.tenantId}`}
        actions={
          <div className="flex flex-wrap gap-2">
            {canManage && (s.status === "Pending") && can("Active") && <Button onClick={() => setMode("activate")}>Activate</Button>}
            {canManage && ["Active", "PaymentOverdue", "RenewalPending", "Expired", "Suspended"].includes(s.status) && <Button variant="outline" onClick={() => setMode("renew")}>Renew</Button>}
            {canControl && can("Suspended") && <Button variant="outline" onClick={() => setMode("suspend")}>Suspend</Button>}
            {canControl && ["Suspended", "Expired"].includes(s.status) && <Button onClick={() => setMode("reactivate")}>Reactivate</Button>}
            {canControl && s.status !== "Cancelled" && <Button variant="outline" onClick={() => setMode("resync")}>Re-sync school</Button>}
            {canControl && can("Cancelled") && <Button variant="ghost" onClick={() => setMode("cancel")}>Cancel</Button>}
          </div>
        }
      />
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 text-sm">
        <StatusBadge status={s.status} />
        <span>{day(s.startDate)} – {day(s.endDate)}</span>
        {s.trialEndsOn && <span>Trial ends {day(s.trialEndsOn)}</span>}
        <span className="text-muted-foreground">Renews at {money(s.renewalAmount, s.currency)}{s.autoRenew ? " (auto)" : ""} · grace {s.graceDays} days</span>
        {s.suspendedReason && <span className="text-destructive-strong">Suspended: {s.suspendedReason}</span>}
        <Link className="ml-auto text-primary hover:underline" to={`/office/schools/${s.schoolId}`}>Open school</Link>
      </div>
      <FormErrorBanner message={mode === "view" ? error : null} />

      <Tabs defaultValue="entitlements">
        <TabsList variant="line">
          <TabsTrigger value="entitlements">Entitlements</TabsTrigger>
          <TabsTrigger value="invoices">Open invoices</TabsTrigger>
          <TabsTrigger value="schedule">Scheduled changes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          {(canControl || canDelete) && <TabsTrigger value="end">End of life</TabsTrigger>}
        </TabsList>
        <TabsContent value="entitlements" className="space-y-4 pt-4">
          <EntitlementsPanel s={s} canEntitle={canEntitle && !["Cancelled"].includes(s.status)} onAdd={() => setMode("override")} onChanged={() => void qc.invalidateQueries({ queryKey: ["office"] })} />
        </TabsContent>
        <TabsContent value="invoices" className="pt-4">
          {s.openInvoices.length === 0 ? <EmptyState title="Nothing owed" description="There are no unpaid invoices." /> : (
            <ul className="divide-y divide-border rounded-xl border border-border bg-card">
              {s.openInvoices.map((i) => (
                <li key={i.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
                  <Link className="font-medium text-primary hover:underline" to={`/office/invoices?id=${i.id}`}>{i.number}</Link>
                  <span className="text-muted-foreground">{i.kind} · due {day(i.dueDate)}</span>
                  {i.overdue && <StatusBadge status="Failed">{i.daysOverdue} days late</StatusBadge>}
                  <span className="ml-auto tabular-nums">{money(i.outstanding, i.currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </TabsContent>
        <TabsContent value="schedule" className="space-y-3 pt-4">
          {canManage && s.status !== "Cancelled" && <Button variant="outline" onClick={() => setMode("schedule")}><CalendarClock className="h-4 w-4" aria-hidden="true" />Schedule a change</Button>}
          <ScheduledList s={s} canManage={canManage} onChanged={() => void qc.invalidateQueries({ queryKey: ["office"] })} />
        </TabsContent>
        {(canControl || canDelete) && <TabsContent value="end" className="pt-4"><EndOfLifePanel s={s} /></TabsContent>}
        <TabsContent value="history" className="pt-4">
          <ol className="space-y-2">
            {s.history.map((h) => (
              <li key={h.id} className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm">
                <p>{h.message}</p>
                <p className="text-xs text-muted-foreground">{h.kind} · {h.actorEmail ?? "system"} · {dateTime(h.occurredAt)}</p>
              </li>
            ))}
          </ol>
        </TabsContent>
      </Tabs>

      <ConfirmDialog open={mode === "activate"} title="Activate subscription" description="The payment rule for this purchase is checked again. This starts the term and opens the school's sign-in." confirmLabel="Activate" busy={act.isPending} error={error} onClose={close} onConfirm={() => act.mutate({ action: "activate" })} />
      <ConfirmDialog open={mode === "renew"} title="Renew subscription" description={`Issues a renewal invoice for ${money(s.renewalAmount, s.currency)}. The term is extended only when that invoice is paid.`} confirmLabel="Issue renewal invoice" busy={act.isPending} error={error} onClose={close} onConfirm={() => act.mutate({ action: "renew" })} />
      <ReasonDialog open={mode === "suspend"} title="Suspend subscription" description="The school's users can no longer sign in. Their data is kept." confirmLabel="Suspend" destructive busy={act.isPending} error={error} onClose={close} onConfirm={(r) => act.mutate({ action: "suspend", reason: r })} />
      <ReasonDialog open={mode === "cancel"} title="Cancel subscription" description="Ends the subscription for good and closes sign-in. The school's data is kept, never deleted." confirmLabel="Cancel subscription" destructive busy={act.isPending} error={error} onClose={close} onConfirm={(r) => act.mutate({ action: "cancel", reason: r })} />
      {mode === "reactivate" && <ReactivateDialog canOverride={canOverridePolicy} busy={act.isPending} error={error} onClose={close} onConfirm={(reason, overridePolicy) => act.mutate({ action: "reactivate", reason, overridePolicy })} />}
      {mode === "resync" && <ResyncDialog id={s.id} schoolName={s.schoolName} onClose={close} onDone={() => done("School re-synced.")} />}
      {mode === "override" && <OverrideDialog s={s} onClose={close} onDone={() => done("Override saved.")} />}
      {mode === "schedule" && <ScheduleDialog s={s} onClose={close} onDone={() => done("Change scheduled.")} />}
    </PageContainer>
  );
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-0.5 text-sm">{items.length ? items.join(", ") : "None"}</p>
    </div>
  );
}

function Limits({ e }: { e: Entitlements }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Fact label="Students">{e.maxStudents}</Fact>
      <Fact label="Branches">{e.maxBranches}</Fact>
      <Fact label="Users">{e.maxUsers}</Fact>
      <Fact label="Storage">{e.storageGb} GB</Fact>
    </dl>
  );
}

function EntitlementsPanel({ s, canEntitle, onAdd, onChanged }: { s: Subscription; canEntitle: boolean; onAdd: () => void; onChanged: () => void }) {
  const remove = useMutation({ mutationFn: (overrideId: string) => removeOverride(s.id, overrideId), onSuccess: () => { toast.success("Override removed."); onChanged(); }, onError: (e) => toast.error(errorText(e)) });
  const live = s.overrides.filter((o) => !o.removedAt);
  return (
    <>
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Sold entitlements" className="space-y-3 rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Sold with the plan</h2>
          <List title="Modules" items={s.included.modules} />
          <List title="AI features" items={s.included.aiFeatures} />
          <List title="Mobile apps" items={s.included.mobileApps} />
          <Limits e={s.included} />
        </section>
        <section aria-label="Current entitlements" className="space-y-3 rounded-xl border border-primary/40 bg-card p-4">
          <h2 className="text-sm font-semibold">What the school has today</h2>
          <List title="Modules" items={s.effective.modules} />
          <List title="AI features" items={s.effective.aiFeatures} />
          <List title="Mobile apps" items={s.effective.mobileApps} />
          <Limits e={s.effective} />
        </section>
      </div>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">School-specific overrides</h2>
        {canEntitle && <Button size="sm" variant="outline" onClick={onAdd}><Plus className="h-4 w-4" aria-hidden="true" />Add override</Button>}
      </div>
      {live.length === 0 ? (
        <EmptyState title="No overrides" description="Everything follows the plan as sold." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {live.map((o) => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <StatusBadge status={o.inEffect ? "Active" : "Pending"}>{o.inEffect ? "In effect" : "Not in effect"}</StatusBadge>
              <span className="font-medium">{o.kind}{o.key ? `: ${o.key}` : ""}</span>
              <span>{o.value != null ? `set to ${o.value}` : o.granted ? "granted" : "removed"}</span>
              <span className="text-muted-foreground">{day(o.effectiveFrom)}{o.effectiveTo ? ` → ${day(o.effectiveTo)}` : ""} · {o.reason}</span>
              {canEntitle && <Button size="sm" variant="ghost" className="ml-auto" aria-label={`Remove override ${o.kind} ${o.key}`} onClick={() => remove.mutate(o.id)}><Trash2 className="h-4 w-4" aria-hidden="true" /></Button>}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ScheduledList({ s, canManage, onChanged }: { s: Subscription; canManage: boolean; onChanged: () => void }) {
  const cancel = useMutation({ mutationFn: (changeId: string) => cancelScheduledChange(s.id, changeId), onSuccess: () => { toast.success("Scheduled change cancelled."); onChanged(); }, onError: (e) => toast.error(errorText(e)) });
  if (s.scheduledChanges.length === 0) return <EmptyState title="Nothing scheduled" description="Plan changes, suspensions and cancellations can be set for a future date." />;
  return (
    <ul className="divide-y divide-border rounded-xl border border-border bg-card">
      {s.scheduledChanges.map((c) => (
        <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
          <StatusBadge status={c.status} />
          <span className="font-medium">{c.kind === "PlanChange" ? `Plan change (${c.quotationNumber})` : c.kind}</span>
          <span>on {day(c.effectiveOn)}</span>
          {c.reason && <span className="text-muted-foreground">{c.reason}</span>}
          {c.failureMessage && <span className="text-destructive-strong">{c.failureMessage}</span>}
          {canManage && c.status === "Pending" && <Button size="sm" variant="ghost" className="ml-auto" onClick={() => cancel.mutate(c.id)}>Cancel</Button>}
        </li>
      ))}
    </ul>
  );
}

function ReactivateDialog({ canOverride, busy, error, onClose, onConfirm }: { canOverride: boolean; busy: boolean; error: string | null; onClose: () => void; onConfirm: (reason: string, overridePolicy: boolean) => void }) {
  const [reason, setReason] = useState("");
  const [override, setOverride] = useState(false);
  return (
    <ConfirmDialog open title="Reactivate subscription" description="Restores sign-in. It is refused while invoices are overdue, unless Finance overrides that policy." confirmLabel="Reactivate" busy={busy} error={error} onClose={onClose} onConfirm={() => reason.trim() && onConfirm(reason.trim(), override)}>
      <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>
      {canOverride && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1" checked={override} onChange={(e) => setOverride(e.target.checked)} />
          <span>Override the overdue-invoice policy (recorded in the audit log)</span>
        </label>
      )}
    </ConfirmDialog>
  );
}

const OVERRIDE_KINDS = ["Module", "AiFeature", "MobileApp", "Feature", "MaxStudents", "MaxBranches", "MaxUsers", "StorageGb"] as const;

function OverrideDialog({ s, onClose, onDone }: { s: Subscription; onClose: () => void; onDone: () => void }) {
  const catalog = useQuery({ queryKey: ["office", "catalog"], queryFn: getCatalog });
  const [kind, setKind] = useState<(typeof OVERRIDE_KINDS)[number]>("Module");
  const [key, setKey] = useState("");
  const [granted, setGranted] = useState(true);
  const [value, setValue] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const numeric = kind.startsWith("Max") || kind === "StorageGb";
  const options = kind === "Module" ? catalog.data?.modules : kind === "AiFeature" ? catalog.data?.aiFeatures : kind === "MobileApp" ? catalog.data?.mobileApps : catalog.data?.features;
  const save = useMutation({
    mutationFn: () => addOverride(s.id, { kind, key: numeric ? null : key, granted: numeric ? true : granted, value: numeric ? Number(value) : null, effectiveFrom: from || null, effectiveTo: to || null, reason: reason.trim() }),
    onSuccess: onDone,
    onError: (e) => setError(errorText(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
        <DialogHeader><DialogTitle>Add an override</DialogTitle><DialogDescription>Changes what {s.schoolName} can use without changing the plan it bought. Takes effect at the school's next token refresh.</DialogDescription></DialogHeader>
        <Field label="What to change">
          <Select value={kind} onValueChange={(v) => { setKind(v as typeof kind); setKey(""); }}>
            <SelectTrigger aria-label="Kind"><SelectValue /></SelectTrigger>
            <SelectContent>{OVERRIDE_KINDS.map((k) => <SelectItem key={k} value={k}>{k.replace(/([a-z])([A-Z])/g, "$1 $2")}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        {numeric ? (
          <Field label="New limit"><Input type="number" min={0} value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        ) : (
          <>
            <Field label="Item">
              <Select value={key} onValueChange={setKey}>
                <SelectTrigger aria-label="Item"><SelectValue placeholder="Choose" /></SelectTrigger>
                <SelectContent>{options?.map((o) => <SelectItem key={o.key} value={o.key}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div role="radiogroup" aria-label="Grant or remove" className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5"><input type="radio" name="grant" checked={granted} onChange={() => setGranted(true)} />Grant it</label>
              <label className="flex items-center gap-1.5"><input type="radio" name="grant" checked={!granted} onChange={() => setGranted(false)} />Take it away</label>
            </div>
          </>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="From (optional)"><Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></Field>
          <Field label="Until (optional)"><Input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></Field>
        </div>
        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => { setError(null); save.mutate(); }} loading={save.isPending} disabled={!reason.trim() || (numeric ? value === "" : !key)}>Save override</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ScheduleDialog({ s, onClose, onDone }: { s: Subscription; onClose: () => void; onDone: () => void }) {
  const [kind, setKind] = useState("PlanChange");
  const [on, setOn] = useState("");
  const [quotationId, setQuotationId] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const quotes = useQuery({ queryKey: ["office", "quotations", "approved", s.schoolId], queryFn: () => listQuotations({ schoolId: s.schoolId, status: "approved", pageSize: 50 }) });
  const save = useMutation({
    mutationFn: () => scheduleChange(s.id, { kind, effectiveOn: on, quotationId: kind === "PlanChange" ? quotationId : null, reason: reason.trim() || null }),
    onSuccess: onDone,
    onError: (e) => setError(errorText(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>Schedule a change</DialogTitle><DialogDescription>Applied automatically on the date you pick. A plan change uses an approved quotation and issues an adjustment invoice then.</DialogDescription></DialogHeader>
        <Field label="Change">
          <Select value={kind} onValueChange={setKind}>
            <SelectTrigger aria-label="Change"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="PlanChange">Change plan</SelectItem>
              <SelectItem value="Suspend">Suspend</SelectItem>
              <SelectItem value="Cancel">Cancel</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Field label="On"><Input type="date" value={on} onChange={(e) => setOn(e.target.value)} /></Field>
        {kind === "PlanChange" && (
          <Field label="Approved quotation">
            <Select value={quotationId} onValueChange={setQuotationId}>
              <SelectTrigger aria-label="Approved quotation"><SelectValue placeholder="Choose" /></SelectTrigger>
              <SelectContent>{quotes.data?.items.map((q) => <SelectItem key={q.id} value={q.id}>{`${q.number} · ${q.planName} · ${money(q.total, q.currency)}`}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        )}
        <Field label={kind === "PlanChange" ? "Reason (optional)" : "Reason"}><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => { setError(null); save.mutate(); }} loading={save.isPending} disabled={!on || (kind === "PlanChange" ? !quotationId : !reason.trim())}>Schedule</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ResyncDialog({ id, schoolName, onClose, onDone }: { id: string; schoolName: string; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [signOut, setSignOut] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = useMutation({ mutationFn: () => resyncSubscription(id, reason.trim(), signOut), onSuccess: onDone, onError: (e) => setError(errorText(e)) });
  return (
    <ConfirmDialog open title="Re-sync school" description={`Writes this subscription to ${schoolName} again: its modules, limits and status. Changes reach the school's users at their next refresh, within 15 minutes.`} confirmLabel="Re-sync" busy={run.isPending} error={error} onClose={onClose} onConfirm={() => reason.trim() && run.mutate()}>
      <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-1" checked={signOut} onChange={(e) => setSignOut(e.target.checked)} />
        <span>Also sign every user out now, so they sign in fresh. A page already open keeps working for up to 15 minutes.</span>
      </label>
    </ConfirmDialog>
  );
}
