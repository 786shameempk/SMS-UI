import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { FormErrorBanner } from "./kit";
import { Field } from "./salesKit";
import { BreakdownView } from "./BreakdownView";
import { listSchools } from "../api/sales";
import { getCatalog, getPublishedVersion, listAddons, previewPricing, sellablePlans } from "../api/plans";
import { errorText } from "../helpers";
import type { QuotationRequest } from "../salesTypes";

const blank = (schoolId: string): QuotationRequest => ({
  schoolId, planId: "", contractMonths: 12, students: 500, branches: 1, addons: [], discountKind: null, discountValue: 0, milestones: null, installments: null,
  removedModules: [], validUntil: null, internalNotes: null, customerTerms: null,
});

/**
 * Builds a quotation. Every figure shown comes from the server's pricing engine; the form only sends choices
 * (plan, term, quantities, add-ons, discount), never a price, and the saved quotation is priced again on the server.
 */
export function QuotationForm({
  initial,
  lockSchool,
  submitLabel,
  busy,
  error,
  onSubmit,
}: {
  initial?: QuotationRequest;
  lockSchool?: boolean;
  submitLabel: string;
  busy: boolean;
  error: string | null;
  onSubmit: (request: QuotationRequest) => void;
}) {
  const [form, setForm] = useState<QuotationRequest>(initial ?? blank(""));
  const set = <K extends keyof QuotationRequest>(key: K, value: QuotationRequest[K]) => setForm((f) => ({ ...f, [key]: value }));

  const schools = useQuery({ queryKey: ["office", "quote-schools"], queryFn: () => listSchools({ status: "open", pageSize: 100 }) });
  const plans = useQuery({ queryKey: ["office", "sellable-plans"], queryFn: sellablePlans });
  const addons = useQuery({ queryKey: ["office", "addons", "active"], queryFn: () => listAddons(true) });
  const catalog = useQuery({ queryKey: ["office", "catalog"], queryFn: getCatalog });
  const version = useQuery({ queryKey: ["office", "published-version", form.planId], queryFn: () => getPublishedVersion(form.planId), enabled: !!form.planId });

  const preview = useMutation({ mutationFn: previewPricing });
  const selection = useMemo(
    () =>
      version.data
        ? {
            planVersionId: version.data.id, contractMonths: form.contractMonths, students: form.students, branches: form.branches, addons: form.addons, discountKind: form.discountKind,
            discountValue: form.discountValue, milestones: form.milestones, installments: form.installments, removedModules: form.removedModules,
          }
        : null,
    [version.data, form.contractMonths, form.students, form.branches, form.addons, form.discountKind, form.discountValue, form.milestones, form.installments, form.removedModules],
  );
  const { mutate: runPreview, reset: resetPreview } = preview;
  useEffect(() => {
    if (!selection) {
      resetPreview();
      return;
    }
    const t = setTimeout(() => runPreview(selection), 350);
    return () => clearTimeout(t);
  }, [selection, runPreview, resetPreview]);

  const toggleAddon = (code: string, on: boolean) => set("addons", on ? [...form.addons, { code, quantity: 1 }] : form.addons.filter((a) => a.code !== code));
  const removable = version.data?.modules.filter((m) => !catalog.data?.alwaysIncludedModules.includes(m)) ?? [];
  const ready = !!form.schoolId && !!form.planId && form.students > 0 && form.branches > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="School">
            <Select value={form.schoolId} onValueChange={(v) => set("schoolId", v)} disabled={lockSchool}>
              <SelectTrigger aria-label="School"><SelectValue placeholder="Choose a school" /></SelectTrigger>
              <SelectContent>{schools.data?.items.map((s) => <SelectItem key={s.id} value={s.id}>{s.schoolName}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Plan">
            <Select value={form.planId} onValueChange={(v) => set("planId", v)}>
              <SelectTrigger aria-label="Plan"><SelectValue placeholder="Choose a plan" /></SelectTrigger>
              <SelectContent>{plans.data?.map((p) => <SelectItem key={p.id} value={p.id}>{`${p.name} (v${p.publishedVersion})`}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Contract length (months)">
            <Input type="number" min={1} max={60} value={form.contractMonths} onChange={(e) => set("contractMonths", Number(e.target.value) || 1)} />
          </Field>
          <Field label="Students"><Input type="number" min={1} value={form.students} onChange={(e) => set("students", Number(e.target.value) || 0)} /></Field>
          <Field label="Branches"><Input type="number" min={1} value={form.branches} onChange={(e) => set("branches", Number(e.target.value) || 0)} /></Field>
          <Field label="Quotation valid until"><Input type="date" value={form.validUntil ?? ""} onChange={(e) => set("validUntil", e.target.value || null)} /></Field>
        </div>

        {(addons.data?.length ?? 0) > 0 && (
          <fieldset className="rounded-xl border border-border p-3">
            <legend className="px-1 text-sm font-medium">Add-ons</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {addons.data!.map((a) => {
                const chosen = form.addons.find((x) => x.code === a.code);
                return (
                  <label key={a.id} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={!!chosen} onChange={(e) => toggleAddon(a.code, e.target.checked)} />
                    <span className="flex-1">{a.name}</span>
                    {chosen && a.pricing === "OneTime" && (
                      <Input aria-label={`${a.name} quantity`} type="number" min={1} className="h-8 w-16" value={chosen.quantity} onChange={(e) => set("addons", form.addons.map((x) => (x.code === a.code ? { ...x, quantity: Math.max(1, Number(e.target.value) || 1) } : x)))} />
                    )}
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {removable.length > 0 && (
          <fieldset className="rounded-xl border border-border p-3">
            <legend className="px-1 text-sm font-medium">Leave out modules (custom plan)</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {removable.map((m) => (
                <label key={m} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={form.removedModules.includes(m)} onChange={(e) => set("removedModules", e.target.checked ? [...form.removedModules, m] : form.removedModules.filter((x) => x !== m))} />
                  {m}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Discount">
            <Select value={form.discountKind ?? "none"} onValueChange={(v) => setForm((f) => ({ ...f, discountKind: v === "none" ? null : (v as "Percent" | "Fixed"), discountValue: v === "none" ? 0 : f.discountValue }))}>
              <SelectTrigger aria-label="Discount type"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No discount</SelectItem>
                <SelectItem value="Percent">Percent</SelectItem>
                <SelectItem value="Fixed">Fixed amount</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Discount value">
            <Input type="number" min={0} disabled={!form.discountKind} value={form.discountValue} onChange={(e) => set("discountValue", Number(e.target.value) || 0)} />
          </Field>
          <Field label="Instalments">
            <Input type="number" min={1} max={12} placeholder="Plan default" value={form.installments ?? ""} onChange={(e) => set("installments", e.target.value ? Number(e.target.value) : null)} />
          </Field>
        </div>

        <Field label="Terms shown to the school"><Textarea rows={3} maxLength={2000} value={form.customerTerms ?? ""} onChange={(e) => set("customerTerms", e.target.value || null)} /></Field>
        <Field label="Internal notes (never shown to the school)"><Textarea rows={2} maxLength={2000} value={form.internalNotes ?? ""} onChange={(e) => set("internalNotes", e.target.value || null)} /></Field>
        <FormErrorBanner message={error} />
        <Button onClick={() => onSubmit(form)} loading={busy} disabled={!ready}>{submitLabel}</Button>
      </div>

      <aside aria-label="Price preview" className="h-fit rounded-xl border border-border bg-card p-4 lg:sticky lg:top-4">
        <h2 className="mb-2 text-sm font-semibold">Price preview</h2>
        {!form.planId ? (
          <p className="text-sm text-muted-foreground">Choose a plan to see the price.</p>
        ) : preview.isError ? (
          <FormErrorBanner message={errorText(preview.error)} />
        ) : preview.data ? (
          <BreakdownView breakdown={preview.data} />
        ) : (
          <p className="text-sm text-muted-foreground">Calculating…</p>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Calculated by the server from the plan and add-on prices. The saved quotation is calculated again.</p>
      </aside>
    </div>
  );
}
