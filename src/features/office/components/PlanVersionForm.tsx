import type { ReactNode } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type { BillingCycle, Catalog, PlanVersionRequest } from "../types";

function Num({ id, label, value, onChange, step = 1, min = 0, hint, disabled }: { id: string; label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; hint?: string; disabled?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" inputMode="decimal" min={min} step={step} value={Number.isFinite(value) ? value : ""} disabled={disabled} onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))} />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function CheckGroup({ legend, items, selected, onChange, disabled, locked = [] }: { legend: string; items: Array<{ key: string; label: string }>; selected: string[]; onChange: (next: string[]) => void; disabled?: boolean; locked?: string[] }) {
  const toggle = (key: string, on: boolean) => onChange(on ? [...selected, key] : selected.filter((k) => k !== key));
  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{legend}</legend>
      <div className="grid max-h-56 gap-1.5 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
        {items.map((i) => {
          const isLocked = locked.includes(i.key);
          return (
            <label key={i.key} className="flex items-start gap-2 text-sm">
              <Checkbox checked={isLocked || selected.includes(i.key)} disabled={disabled || isLocked} onCheckedChange={(v) => toggle(i.key, v === true)} aria-label={i.label} />
              <span>
                {i.label}
                {isLocked && <span className="ml-1 text-xs text-muted-foreground">(always included)</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** The editable fields of one plan version. Read-only (disabled) for a published version. */
export default function PlanVersionForm({ value, onChange, catalog, disabled }: { value: PlanVersionRequest; onChange: (next: PlanVersionRequest) => void; catalog: Catalog; disabled?: boolean }) {
  const set = <K extends keyof PlanVersionRequest>(key: K, v: PlanVersionRequest[K]) => onChange({ ...value, [key]: v });
  return (
    <div className="space-y-6">
      <Section title="Pricing">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="pv-cycle">Billing cycle</Label>
            <Select value={value.billingCycle} onValueChange={(v) => set("billingCycle", v as BillingCycle)} disabled={disabled}>
              <SelectTrigger id="pv-cycle">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Monthly", "Quarterly", "Annual", "Custom"] as const).map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {value.billingCycle === "Custom" && <Num id="pv-cycle-months" label="Months per cycle" min={1} value={value.cycleMonths ?? 0} onChange={(v) => set("cycleMonths", v)} disabled={disabled} />}
          <div className="space-y-1.5">
            <Label htmlFor="pv-currency">Currency</Label>
            <Input id="pv-currency" maxLength={3} value={value.currencyCode} disabled={disabled} onChange={(e) => set("currencyCode", e.target.value.toUpperCase())} />
          </div>
          <Num id="pv-price" label="Base price per cycle" step={0.01} value={value.basePrice} onChange={(v) => set("basePrice", v)} disabled={disabled} />
          <Num id="pv-tax" label="Tax %" step={0.01} value={value.taxRatePercent} onChange={(v) => set("taxRatePercent", v)} disabled={disabled} />
        </div>
      </Section>

      <Section title="Capacity and limits">
        <div className="grid gap-3 sm:grid-cols-3">
          <Num id="pv-students" label="Students included" value={value.includedStudents} onChange={(v) => set("includedStudents", v)} disabled={disabled} />
          <Num id="pv-extra-student" label="Extra student price (per cycle)" step={0.01} value={value.extraStudentPrice} onChange={(v) => set("extraStudentPrice", v)} disabled={disabled} />
          <Num id="pv-users" label="User / staff limit" value={value.maxUsers} onChange={(v) => set("maxUsers", v)} disabled={disabled} />
          <Num id="pv-branches" label="Branches included" min={1} value={value.maxBranches} onChange={(v) => set("maxBranches", v)} disabled={disabled} hint="Enforced when the school adds branches." />
          <Num id="pv-extra-branch" label="Extra branch price (per cycle)" step={0.01} value={value.extraBranchPrice} onChange={(v) => set("extraBranchPrice", v)} disabled={disabled} />
          <Num id="pv-storage" label="Storage (GB)" value={value.storageGb} onChange={(v) => set("storageGb", v)} disabled={disabled} />
        </div>
      </Section>

      <Section title="What the plan includes">
        <CheckGroup legend="Modules" items={catalog.modules.map((m) => ({ key: m.key, label: m.label }))} selected={value.modules} onChange={(n) => set("modules", n)} disabled={disabled} locked={catalog.alwaysIncludedModules} />
        <CheckGroup legend="AI features" items={catalog.aiFeatures.map((m) => ({ key: m.key, label: m.label }))} selected={value.aiFeatures} onChange={(n) => set("aiFeatures", n)} disabled={disabled} />
        <div className="grid gap-4 sm:grid-cols-2">
          <CheckGroup legend="Mobile apps" items={catalog.mobileApps.map((m) => ({ key: m.key, label: m.label }))} selected={value.mobileApps} onChange={(n) => set("mobileApps", n)} disabled={disabled} />
          <CheckGroup legend="Features" items={catalog.features.map((m) => ({ key: m.key, label: m.label }))} selected={value.features} onChange={(n) => set("features", n)} disabled={disabled} />
        </div>
      </Section>

      <Section title="Terms">
        <div className="grid gap-3 sm:grid-cols-3">
          <Num id="pv-trial" label="Trial (days)" value={value.trialDays} onChange={(v) => set("trialDays", v)} disabled={disabled} />
          <Num id="pv-grace" label="Grace period (days)" value={value.graceDays} onChange={(v) => set("graceDays", v)} disabled={disabled} hint="Access continues this long after an unpaid renewal." />
          <div className="flex items-end gap-2 pb-2">
            <Switch id="pv-autorenew" checked={value.autoRenew} onCheckedChange={(v) => set("autoRenew", v)} disabled={disabled} />
            <Label htmlFor="pv-autorenew">Renews automatically</Label>
          </div>
        </div>
        {([
          ["renewalRules", "Renewal rules"],
          ["upgradePolicy", "Upgrade policy"],
          ["downgradePolicy", "Downgrade policy"],
          ["changeNotes", "Notes for this version"],
        ] as const).map(([key, label]) => (
          <div key={key} className="space-y-1.5">
            <Label htmlFor={`pv-${key}`}>{label}</Label>
            <Textarea id={`pv-${key}`} rows={2} maxLength={1000} value={value[key] ?? ""} disabled={disabled} onChange={(e) => set(key, e.target.value || null)} />
          </div>
        ))}
      </Section>
    </div>
  );
}
