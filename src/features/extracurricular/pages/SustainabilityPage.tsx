import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BadgeCheck, Leaf, Plus, Trash2 } from "lucide-react";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { deleteCampaign, deleteMeasurement, listCampaigns, listMeasurements, saveCampaign, saveMeasurement, verifyMeasurement } from "../api";
import { ACTIVITY_STATUS_LABEL } from "../constants";
import { SelectField, formatDate, options, todayIso, useApiMutation, useExtracurricularAccess } from "../shared";
import type { Campaign, Measurement, MeasurementKind } from "../types";

const PROGRAMS = ["School gardening and tree planting", "Recycling and waste segregation", "Plastic-free campus", "Water conservation", "Energy conservation", "Composting and organic farming", "Biodiversity and nature club", "Clean-campus campaign", "Environmental awareness", "Community cleanup"];

export default function SustainabilityPage() {
  const access = useExtracurricularAccess();
  const campaigns = useQuery({ queryKey: ["extracurricular", "campaigns"], queryFn: () => listCampaigns() });
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [logging, setLogging] = useState<Campaign | null>(null);
  const [removing, setRemoving] = useState<Campaign | null>(null);
  const remove = useApiMutation(deleteCampaign, { success: "Campaign deleted", onSuccess: () => setRemoving(null) });
  const items = campaigns.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Progress counts only figures that were measured <em>and</em> verified. Estimates are shown separately with the way they were calculated; they never count towards a target.
        </p>
        {access.canManage && (
          <Button onClick={() => { setEditing(null); setFormOpen(true); }}>
            <Plus className="h-4 w-4" /> New campaign
          </Button>
        )}
      </div>

      {campaigns.isError && <ErrorState onRetry={() => campaigns.refetch()} retrying={campaigns.isFetching} />}
      {campaigns.isLoading && <Skeleton className="h-40 w-full" />}
      {campaigns.data && items.length === 0 && <EmptyState icon={Leaf} title="No campaigns yet" description="Tree planting, recycling, water saving — set a target and record real figures against it." />}

      <div className="grid gap-4 lg:grid-cols-2">
        {items.map((c) => (
          <Card key={c.id}>
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-base font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.programType}{c.location ? ` · ${c.location}` : ""}</p>
                </div>
                <StatusBadge status={c.status} label={ACTIVITY_STATUS_LABEL[c.status]} />
              </div>
              <div>
                <div className="flex items-baseline justify-between text-sm">
                  <span><span className="text-2xl font-semibold">{c.verifiedTotal}</span> <span className="text-muted-foreground">of {c.target} {c.unit} verified</span></span>
                  <span className="font-medium">{c.progressPercent}%</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-secondary" role="progressbar" aria-valuenow={c.progressPercent} aria-valuemin={0} aria-valuemax={100} aria-label={`${c.name} progress`}>
                  <div className="h-full rounded-full bg-success" style={{ width: `${c.progressPercent}%` }} />
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-1 text-xs text-muted-foreground sm:grid-cols-4">
                <div><dt>Measured</dt><dd className="text-sm text-foreground">{c.measuredTotal}</dd></div>
                <div><dt>Estimated</dt><dd className="text-sm text-foreground">{c.estimatedTotal}</dd></div>
                <div><dt>Participants</dt><dd className="text-sm text-foreground">{c.participants}</dd></div>
                <div><dt>Volunteer hours</dt><dd className="text-sm text-foreground">{c.volunteerHours}</dd></div>
              </dl>
              <div className="flex flex-wrap items-center gap-1">
                <Button size="sm" onClick={() => setLogging(c)}>Figures ({c.entries})</Button>
                {access.canManage && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => { setEditing(c); setFormOpen(true); }}>Edit</Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" aria-label={`Delete ${c.name}`} onClick={() => setRemoving(c)}><Trash2 className="h-3.5 w-3.5 text-destructive-strong" /></Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <CampaignFormDialog open={formOpen} onOpenChange={setFormOpen} campaign={editing} />
      <MeasurementsDialog campaign={logging} onOpenChange={(o) => !o && setLogging(null)} canManage={access.canManage} canApprove={access.canApprove} />
      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(v) => !v && setRemoving(null)}
        title="Delete campaign"
        description={`Delete "${removing?.name}"? A campaign with recorded figures can only be marked completed.`}
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

function CampaignFormDialog({ open, onOpenChange, campaign }: { open: boolean; onOpenChange: (o: boolean) => void; campaign: Campaign | null }) {
  const blank = () => ({ name: "", programType: PROGRAMS[0], metricName: "", unit: "", target: "", baseline: "0", startDate: todayIso(), endDate: "", coordinatorName: "", location: "", description: "", status: "Active" as Campaign["status"] });
  const [v, setV] = useState(blank());
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    if (!open) return;
    setTouched(false);
    setV(campaign ? { name: campaign.name, programType: campaign.programType, metricName: campaign.metricName, unit: campaign.unit, target: String(campaign.target), baseline: String(campaign.baseline), startDate: campaign.startDate, endDate: campaign.endDate ?? "", coordinatorName: campaign.coordinatorName ?? "", location: campaign.location ?? "", description: campaign.description ?? "", status: campaign.status } : blank());
  }, [open, campaign]);
  const save = useApiMutation(saveCampaign, { success: "Campaign saved", onSuccess: () => onOpenChange(false) });
  const set = <K extends keyof ReturnType<typeof blank>>(k: K, x: ReturnType<typeof blank>[K]) => setV((s) => ({ ...s, [k]: x }));
  const errors = {
    name: !v.name.trim() ? "Name is required" : undefined,
    metricName: !v.metricName.trim() ? "What is being measured?" : undefined,
    unit: !v.unit.trim() ? "Unit is required" : undefined,
    target: !(Number(v.target) > 0) ? "Enter a target above zero" : undefined,
    baseline: Number.isNaN(Number(v.baseline)) || Number(v.baseline) < 0 ? "Enter zero or more" : undefined,
    endDate: v.endDate && v.endDate < v.startDate ? "The campaign cannot end before it starts" : undefined,
  };
  const figures = (campaign?.entries ?? 0) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{campaign ? "Edit campaign" : "New campaign"}</DialogTitle>
          <DialogDescription>Decide what will be measured, in which unit, and the target for the year.</DialogDescription>
        </DialogHeader>
        <form className="space-y-4" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (Object.values(errors).some(Boolean)) return; save.mutate({ id: campaign?.id, name: v.name.trim(), programType: v.programType.trim(), description: v.description.trim() || null, metricName: v.metricName.trim(), unit: v.unit.trim(), target: Number(v.target), baseline: Number(v.baseline || 0), startDate: v.startDate, endDate: v.endDate || null, coordinatorName: v.coordinatorName.trim() || null, location: v.location.trim() || null, status: v.status }); }}>
          <FormField label="Name" htmlFor="cp-name" required error={touched ? errors.name : undefined}><Input id="cp-name" value={v.name} onChange={(e) => set("name", e.target.value)} aria-invalid={touched && errors.name ? true : undefined} /></FormField>
          <FormField label="Kind of programme" htmlFor="cp-type" hint="Pick one or type your own">
            <Input id="cp-type" list="cp-types" value={v.programType} onChange={(e) => set("programType", e.target.value)} />
            <datalist id="cp-types">{PROGRAMS.map((p) => <option key={p} value={p} />)}</datalist>
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="What is measured" htmlFor="cp-metric" required error={touched ? errors.metricName : undefined} hint={figures ? "Locked once figures exist" : "e.g. Trees planted"}><Input id="cp-metric" value={v.metricName} onChange={(e) => set("metricName", e.target.value)} disabled={figures} /></FormField>
            <FormField label="Unit" htmlFor="cp-unit" required error={touched ? errors.unit : undefined} hint={figures ? "Locked once figures exist" : "trees, kg, litres, kWh"}><Input id="cp-unit" value={v.unit} onChange={(e) => set("unit", e.target.value)} disabled={figures} /></FormField>
            <FormField label="Target" htmlFor="cp-target" required error={touched ? errors.target : undefined}><Input id="cp-target" inputMode="decimal" value={v.target} onChange={(e) => set("target", e.target.value)} aria-invalid={touched && errors.target ? true : undefined} /></FormField>
            <FormField label="Starting value" htmlFor="cp-baseline" error={touched ? errors.baseline : undefined} hint="What it was before the campaign"><Input id="cp-baseline" inputMode="decimal" value={v.baseline} onChange={(e) => set("baseline", e.target.value)} /></FormField>
            <FormField label="Starts" htmlFor="cp-start"><Input id="cp-start" type="date" value={v.startDate} onChange={(e) => set("startDate", e.target.value)} /></FormField>
            <FormField label="Ends" htmlFor="cp-end" optional error={touched ? errors.endDate : undefined}><Input id="cp-end" type="date" value={v.endDate} onChange={(e) => set("endDate", e.target.value)} /></FormField>
            <FormField label="Coordinator" htmlFor="cp-coord" optional><Input id="cp-coord" value={v.coordinatorName} onChange={(e) => set("coordinatorName", e.target.value)} /></FormField>
            <FormField label="Location" htmlFor="cp-loc" optional><Input id="cp-loc" value={v.location} onChange={(e) => set("location", e.target.value)} /></FormField>
          </div>
          <FormField label="Status" htmlFor="cp-status"><SelectField id="cp-status" value={v.status} onChange={(x) => x && set("status", x)} items={options(ACTIVITY_STATUS_LABEL)} /></FormField>
          <FormField label="Description" htmlFor="cp-desc" optional><Textarea id="cp-desc" rows={2} value={v.description} onChange={(e) => set("description", e.target.value)} /></FormField>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" loading={save.isPending}>{campaign ? "Save changes" : "Create campaign"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function MeasurementsDialog({ campaign, onOpenChange, canManage, canApprove }: { campaign: Campaign | null; onOpenChange: (o: boolean) => void; canManage: boolean; canApprove: boolean }) {
  const rows = useQuery({ queryKey: ["extracurricular", "measurements", campaign?.id], queryFn: () => listMeasurements(campaign!.id), enabled: Boolean(campaign) });
  const blank = () => ({ date: todayIso(), value: "", kind: "Measured" as MeasurementKind, method: "", evidence: "", participants: "", hours: "" });
  const [v, setV] = useState(blank());
  const [editing, setEditing] = useState<Measurement | null>(null);
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setV(blank());
    setEditing(null);
    setTouched(false);
  }, [campaign?.id]);

  const save = useApiMutation(() => saveMeasurement(campaign!.id, { id: editing?.id ?? null, date: v.date, value: Number(v.value), kind: v.kind, method: v.method.trim() || null, evidence: v.evidence.trim() || null, participants: v.participants ? Number(v.participants) : 0, volunteerHours: v.hours ? Number(v.hours) : 0 }), {
    success: "Figure recorded",
    onSuccess: () => { setV(blank()); setEditing(null); setTouched(false); },
  });
  const verify = useApiMutation(({ id, verified }: { id: string; verified: boolean }) => verifyMeasurement(id, verified), { success: "Updated" });
  const remove = useApiMutation(deleteMeasurement, { success: "Figure removed" });
  const set = <K extends keyof ReturnType<typeof blank>>(k: K, x: ReturnType<typeof blank>[K]) => setV((s) => ({ ...s, [k]: x }));
  const errors = {
    value: v.value === "" || Number.isNaN(Number(v.value)) || Number(v.value) < 0 ? "Enter a number, zero or more" : undefined,
    method: v.kind === "Estimated" && !v.method.trim() ? "Say how this estimate was calculated" : undefined,
    participants: v.participants && !/^\d+$/.test(v.participants) ? "Whole number" : undefined,
    hours: v.hours && (Number.isNaN(Number(v.hours)) || Number(v.hours) < 0) ? "Zero or more" : undefined,
  };

  return (
    <Dialog open={Boolean(campaign)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{campaign?.name}</DialogTitle>
          <DialogDescription>{campaign?.metricName} in {campaign?.unit}. Target {campaign?.target}.</DialogDescription>
        </DialogHeader>
        {rows.isLoading && <Skeleton className="h-24 w-full" />}
        {rows.data && rows.data.length === 0 && <EmptyState size="sm" bare title="No figures yet" />}
        <ul className="divide-y divide-border rounded-lg border border-border text-sm empty:hidden">
          {rows.data?.map((m) => (
            <li key={m.id} className="space-y-1 px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><span className="font-semibold">{m.value}</span> {campaign?.unit} · {formatDate(m.date)}</span>
                <span className="flex items-center gap-1">
                  <Badge variant={m.kind === "Measured" ? "success" : "warning"}>{m.kind === "Measured" ? "Measured" : "Estimate"}</Badge>
                  {m.verified && <Badge variant="info"><BadgeCheck className="mr-1 h-3 w-3" />Verified{m.verifiedBy ? ` by ${m.verifiedBy}` : ""}</Badge>}
                </span>
              </div>
              {m.kind === "Estimated" && m.method && <p className="text-xs text-muted-foreground">Calculated as: {m.method}</p>}
              {m.evidence && <p className="text-xs text-muted-foreground">Evidence: {m.evidence}</p>}
              <p className="text-xs text-muted-foreground">{m.participants} participants · {m.volunteerHours} volunteer hours</p>
              <div className="flex gap-1">
                {canApprove && m.kind === "Measured" && <Button size="sm" variant="outline" onClick={() => verify.mutate({ id: m.id, verified: !m.verified })}>{m.verified ? "Remove verification" : "Verify"}</Button>}
                {canManage && <Button size="sm" variant="ghost" onClick={() => { setEditing(m); setV({ date: m.date, value: String(m.value), kind: m.kind, method: m.method ?? "", evidence: m.evidence ?? "", participants: String(m.participants), hours: String(m.volunteerHours) }); }}>Edit</Button>}
                {canManage && <Button size="sm" variant="ghost" onClick={() => remove.mutate(m.id)}>Remove</Button>}
              </div>
            </li>
          ))}
        </ul>
        {canManage && (
          <form className="space-y-3 rounded-lg border border-border p-3" noValidate onSubmit={(e) => { e.preventDefault(); setTouched(true); if (Object.values(errors).some(Boolean)) return; save.mutate(undefined); }}>
            <p className="text-sm font-medium">{editing ? "Edit figure (verification is cleared)" : "Record a figure"}</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Date" htmlFor="ms-date"><Input id="ms-date" type="date" value={v.date} onChange={(e) => set("date", e.target.value)} /></FormField>
              <FormField label={`Value (${campaign?.unit ?? ""})`} htmlFor="ms-value" required error={touched ? errors.value : undefined}><Input id="ms-value" inputMode="decimal" value={v.value} onChange={(e) => set("value", e.target.value)} aria-invalid={touched && errors.value ? true : undefined} /></FormField>
              <FormField label="This figure is" htmlFor="ms-kind"><SelectField id="ms-kind" value={v.kind} onChange={(x) => x && set("kind", x)} items={[{ value: "Measured", label: "Measured (counted or weighed)" }, { value: "Estimated", label: "Estimated (calculated)" }]} /></FormField>
            </div>
            {v.kind === "Estimated" && <FormField label="How it was calculated" htmlFor="ms-method" required error={touched ? errors.method : undefined}><Textarea id="ms-method" rows={2} value={v.method} onChange={(e) => set("method", e.target.value)} placeholder="e.g. 50 trees x 22 kg CO2 absorbed per tree per year (source: …)" /></FormField>}
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField label="Evidence" htmlFor="ms-evidence" optional hint="Log page, photo set, weighing slip"><Input id="ms-evidence" value={v.evidence} onChange={(e) => set("evidence", e.target.value)} /></FormField>
              <FormField label="Participants" htmlFor="ms-people" optional error={touched ? errors.participants : undefined}><Input id="ms-people" inputMode="numeric" value={v.participants} onChange={(e) => set("participants", e.target.value)} /></FormField>
              <FormField label="Volunteer hours" htmlFor="ms-hours" optional error={touched ? errors.hours : undefined}><Input id="ms-hours" inputMode="decimal" value={v.hours} onChange={(e) => set("hours", e.target.value)} /></FormField>
            </div>
            <div className="flex gap-2">
              <Button type="submit" loading={save.isPending}>{editing ? "Save figure" : "Record figure"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setEditing(null); setV(blank()); }}>Cancel edit</Button>}
            </div>
          </form>
        )}
        <DialogFooter><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Close</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
