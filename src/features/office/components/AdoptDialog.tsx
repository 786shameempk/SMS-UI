import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { FormErrorBanner } from "./kit";
import { Field, StatusBadge } from "./salesKit";
import { adoptSchool, unmanagedTenants } from "../api/sales";
import { sellablePlans } from "../api/plans";
import { errorText } from "../helpers";

/** Brings a school that was created outside the office under its control. */
export function AdoptDialog({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const tenants = useQuery({ queryKey: ["office", "unmanaged-tenants"], queryFn: unmanagedTenants });
  const plans = useQuery({ queryKey: ["office", "sellable-plans"], queryFn: sellablePlans });
  const [tenantId, setTenantId] = useState("");
  const [planId, setPlanId] = useState("");
  const [months, setMonths] = useState("12");
  const [endDate, setEndDate] = useState("");
  const [keep, setKeep] = useState(true);
  const [autoRenew, setAutoRenew] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chosen = tenants.data?.find((t) => t.tenantId === tenantId);

  const adopt = useMutation({
    mutationFn: () => adoptSchool({ tenantId, planId, termMonths: months ? Number(months) : null, endDate: endDate || null, keepCurrentEntitlements: keep, autoRenew, notes: null }),
    onSuccess: (sub) => {
      toast.success(`${sub.schoolName} is now managed by the office.`);
      navigate(`/office/schools/${sub.schoolId}`);
    },
    onError: (e) => setError(errorText(e)),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && !adopt.isPending && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adopt an existing school</DialogTitle>
          <DialogDescription>For schools created before the office, or in the old console. The school keeps working as it does today; from now on its plan, status and administrators are managed here.</DialogDescription>
        </DialogHeader>
        {tenants.isLoading ? (
          <Skeleton className="h-24 rounded-lg" />
        ) : tenants.data?.length === 0 ? (
          <p className="rounded-lg border border-border p-4 text-sm text-muted-foreground">Every school is already managed by the office.</p>
        ) : (
          <>
            <Field label="School">
              <Select value={tenantId} onValueChange={setTenantId}>
                <SelectTrigger aria-label="School"><SelectValue placeholder="Choose a school" /></SelectTrigger>
                <SelectContent>{tenants.data?.map((t) => <SelectItem key={t.tenantId} value={t.tenantId}>{`${t.schoolName} (${t.subdomain})`}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            {chosen && (
              <p className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <StatusBadge status={chosen.status === "Active" ? "Active" : chosen.status === "Trial" ? "Trial" : chosen.status === "Suspended" ? "Suspended" : chosen.status} />
                <span>{chosen.users} users · {chosen.branches} branch{chosen.branches === 1 ? "" : "es"} · plan “{chosen.planName}” · administrator {chosen.adminEmail ?? "none"}</span>
              </p>
            )}
            <Field label="Office plan">
              <Select value={planId} onValueChange={setPlanId}>
                <SelectTrigger aria-label="Office plan"><SelectValue placeholder="Choose a plan" /></SelectTrigger>
                <SelectContent>{plans.data?.map((p) => <SelectItem key={p.id} value={p.id}>{`${p.name} (v${p.publishedVersion})`}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Term (months)"><Input type="number" min={1} max={60} value={months} onChange={(e) => setMonths(e.target.value)} /></Field>
              <Field label="Or ends on"><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
            </div>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={keep} onChange={(e) => setKeep(e.target.checked)} />
              <span>Keep the modules and limits the school has today. AI features, mobile apps and extras follow the chosen plan. Untick to give it exactly the plan.</span>
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={autoRenew} onChange={(e) => setAutoRenew(e.target.checked)} />
              Renew automatically
            </label>
          </>
        )}
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={adopt.isPending}>Cancel</Button>
          <Button onClick={() => { setError(null); adopt.mutate(); }} loading={adopt.isPending} disabled={!tenantId || !planId}>Adopt school</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
