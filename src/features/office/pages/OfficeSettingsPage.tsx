import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Play, Settings } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorBanner } from "../components/kit";
import { Field, StatusBadge } from "../components/salesKit";
import { getOfficeSettings, runMaintenanceNow, updateCompany } from "../api/ops";
import { ago, errorText } from "../helpers";
import { useHasOfficePermission } from "../store";
import type { OfficeCompany, OfficeSettingsView } from "../opsTypes";

export default function OfficeSettingsPage() {
  const settings = useQuery({ queryKey: ["office", "settings"], queryFn: getOfficeSettings });
  return (
    <PageContainer>
      <PageHeader icon={Settings} title="Office settings" description="Company details on quotations and invoices, the rules the office runs by, and the scheduled work." />
      {settings.isLoading ? <Skeleton className="h-72 rounded-xl" /> : settings.isError ? <ErrorState onRetry={() => settings.refetch()} retrying={settings.isRefetching} /> : <Body s={settings.data!} />}
    </PageContainer>
  );
}

function Body({ s }: { s: OfficeSettingsView }) {
  const qc = useQueryClient();
  const canManage = useHasOfficePermission("settings.manage");
  const [form, setForm] = useState<OfficeCompany>(s.company);
  const [error, setError] = useState<string | null>(null);
  const set = (key: keyof OfficeCompany) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const save = useMutation({
    mutationFn: () => updateCompany({ ...form, name: form.name.trim() }),
    onSuccess: () => { toast.success("Company details saved."); setError(null); void qc.invalidateQueries({ queryKey: ["office", "settings"] }); },
    onError: (e) => setError(errorText(e)),
  });
  const run = useMutation({
    mutationFn: () => runMaintenanceNow(),
    onSuccess: (r) => { toast.success(r.errors.length ? `Ran with ${r.errors.length} problem(s).` : "Scheduled work ran."); void qc.invalidateQueries({ queryKey: ["office"] }); },
    onError: (e) => toast.error(errorText(e)),
  });
  const p = s.policies;
  const rules: Array<[string, string]> = [
    ["Discount needing senior approval", `above ${p.highDiscountPercent}%`],
    ["Quotation validity", `${p.defaultValidityDays} days by default, ${p.maxValidityDays} at most`],
    ["Super Admin approving their own work", p.superAdminMaySelfApprove ? "allowed, and recorded in the audit log" : "not allowed"],
    ["Quotations approved without review", p.autoApproveWithoutDiscount ? "when there is no discount" : "never"],
    ["School set up after", p.activationRule === "FirstInvoice" ? "the first invoice is verified" : p.activationRule === "Full" ? "the whole amount is verified" : "any verified payment"],
    ["Invoice due", `${p.invoiceDueDays} days after issue`],
    ["Renewal invoice sent", `${p.renewalWindowDays} days before the term ends`],
    ["Overdue reminders", `every ${p.reminderEveryDays} days, up to ${p.maxReminders}`],
    ["Onboarding flagged as stuck", `after ${p.stuckOnboardingDays} days in one stage`],
    ["Usage warning", `at ${p.usageWarnPercent}% of a limit`],
    ["Payment gateway callback", p.webhookConfigured ? "configured" : "not configured"],
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="space-y-3 p-4">
        <h2 className="text-sm font-semibold">Company details</h2>
        <p className="text-xs text-muted-foreground">Shown on every quotation and invoice.</p>
        <Field label="Company name"><Input value={form.name} onChange={set("name")} maxLength={150} disabled={!canManage} /></Field>
        <Field label="Address"><Textarea rows={2} value={form.address ?? ""} onChange={set("address")} maxLength={500} disabled={!canManage} /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Tax ID (GSTIN)"><Input value={form.taxId ?? ""} onChange={set("taxId")} maxLength={50} disabled={!canManage} /></Field>
          <Field label="Phone"><Input value={form.phone ?? ""} onChange={set("phone")} maxLength={40} disabled={!canManage} /></Field>
        </div>
        <Field label="Billing email"><Input type="email" value={form.email ?? ""} onChange={set("email")} maxLength={150} disabled={!canManage} /></Field>
        <Field label="How to pay (bank details)"><Textarea rows={3} value={form.paymentInstructions ?? ""} onChange={set("paymentInstructions")} maxLength={1000} disabled={!canManage} /></Field>
        <FormErrorBanner message={error} />
        {canManage && <Button onClick={() => { setError(null); save.mutate(); }} loading={save.isPending} disabled={!form.name.trim()}>Save company details</Button>}
      </Card>

      <div className="space-y-6">
        <Card className="p-4">
          <h2 className="mb-1 text-sm font-semibold">Rules the office runs by</h2>
          <p className="mb-3 text-xs text-muted-foreground">These control money and access, so they are set in the deployment configuration and change with a release, not with a click.</p>
          <dl className="divide-y divide-border text-sm">
            {rules.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-1.5"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>
            ))}
          </dl>
        </Card>

        <Card className="space-y-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold">Scheduled work</h2>
            {canManage && <Button size="sm" variant="outline" onClick={() => run.mutate()} loading={run.isPending}><Play className="h-4 w-4" aria-hidden="true" />Run now</Button>}
          </div>
          <p className="text-sm text-muted-foreground">
            {s.jobsEnabled ? `Runs every ${s.jobIntervalMinutes} minutes inside the API.` : "Switched off in this deployment: run it from an external scheduler or with Run now."} It applies overdue and expiry rules,
            expires old quotations, invoices auto-renewals, sends reminders and refreshes alerts.
          </p>
          {s.jobs.length === 0 ? <p className="text-sm text-muted-foreground">It has not run yet.</p> : s.jobs.map((j) => (
            <div key={j.name} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2"><span className="font-medium">{j.name}</span>{j.lastSucceeded != null && <StatusBadge status={j.lastSucceeded ? "Resolved" : "Failed"}>{j.lastSucceeded ? "Succeeded" : "Had problems"}</StatusBadge>}</div>
              <p className="text-xs text-muted-foreground">{j.lastFinishedAt ? `Finished ${ago(j.lastFinishedAt)}` : "Running or never finished"}</p>
              {j.lastResult && <p className="mt-1">{j.lastResult}</p>}
            </div>
          ))}
        </Card>
      </div>
    </div>
  );
}
