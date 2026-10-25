import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Flag, Settings2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { ConfirmDialog, FormErrorBanner } from "./kit";
import { getReadiness, markSchoolReady, saveReadinessPolicy, type ReadinessPolicy, type ReadinessReport } from "../api/onboardingImport";
import { dateTime, errorText } from "../helpers";
import { useHasOfficePermission } from "../store";

/**
 * Setup status for a school: every go-live check with what it found, the policy behind them, and the two deliberate steps that
 * follow - someone marks the school ready, then the subscription is activated (its own page, its own permission).
 */
export function ReadinessCard({ schoolId }: { schoolId: string }) {
  const qc = useQueryClient();
  const canMark = useHasOfficePermission("onboarding.golive.mark-ready");
  const canPolicy = useHasOfficePermission("onboarding.manage");
  const canSubscription = useHasOfficePermission("subscriptions.view");
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const report = useQuery({ queryKey: ["office", "readiness", schoolId], queryFn: () => getReadiness(schoolId) });
  const mark = useMutation({
    mutationFn: () => markSchoolReady(schoolId),
    onSuccess: () => { toast.success("Marked ready for go-live."); setConfirming(false); void qc.invalidateQueries({ queryKey: ["office", "readiness", schoolId] }); },
    onError: (e) => { toast.error(errorText(e)); setConfirming(false); void report.refetch(); },
  });

  if (report.isLoading) return <Skeleton className="h-48 w-full" />;
  if (report.isError) return <ErrorState description={errorText(report.error)} onRetry={() => void report.refetch()} />;
  const r = report.data!;
  const marked = !!r.goLive.markedReadyAt;

  return (
    <Card aria-label="Setup status">
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2">
          Setup status
          <Badge variant={marked ? "success" : r.ready ? "info" : "warning"}>{marked ? "Marked ready" : r.ready ? "Ready to be marked" : `${r.blockers.length} blocker${r.blockers.length === 1 ? "" : "s"}`}</Badge>
        </CardTitle>
        <CardDescription>
          Stage: {r.goLive.stage}. {r.passed} of {r.checks.length} checks pass.
          {marked && ` Marked ready by ${r.goLive.markedReadyBy} on ${dateTime(r.goLive.markedReadyAt!)}.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {r.problem && <FormErrorBanner message={`Some checks could not run: ${r.problem}`} />}
        <ul className="divide-y rounded-md border">
          {r.checks.map((c) => (
            <li key={c.key} className="flex items-start gap-3 p-3 text-sm">
              {c.passed ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-label="Passed" /> : <CircleAlert className={`mt-0.5 h-4 w-4 shrink-0 ${c.required ? "text-destructive" : "text-warning"}`} aria-label={c.required ? "Blocking" : "Not required"} />}
              <div className="min-w-0">
                <p className="font-medium">{c.label}{!c.required && <span className="ms-2 text-xs font-normal text-muted-foreground">(not required)</span>}</p>
                <p className="text-muted-foreground">{c.detail}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-2">
          {canMark && !marked && (
            <Button onClick={() => setConfirming(true)} disabled={!r.ready}><Flag className="h-4 w-4" aria-hidden="true" />Mark ready for go-live</Button>
          )}
          {marked && r.goLive.subscriptionId && canSubscription && (
            <Button asChild><Link to={`/office/subscriptions/${r.goLive.subscriptionId}`}>Go to the subscription to activate</Link></Button>
          )}
          {canPolicy && <Button variant="outline" onClick={() => setEditing(true)}><Settings2 className="h-4 w-4" aria-hidden="true" />Readiness rules</Button>}
        </div>
        <p className="text-xs text-muted-foreground">Marking ready does not make the school live. The subscription is activated separately, and changing the rules clears the mark.</p>
      </CardContent>
      {editing && <PolicyDialog schoolId={schoolId} policy={r.policy} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); void qc.invalidateQueries({ queryKey: ["office", "readiness", schoolId] }); }} />}
      <ConfirmDialog open={confirming} title="Mark this school ready for go-live?" confirmLabel="Mark ready" busy={mark.isPending}
        description="Every required check passes right now. This records your decision; the subscription still has to be activated." onConfirm={() => mark.mutate()} onClose={() => setConfirming(false)} />
    </Card>
  );
}

function PolicyDialog({ schoolId, policy, onClose, onSaved }: { schoolId: string; policy: ReadinessPolicy; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(policy);
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({ mutationFn: () => saveReadinessPolicy(schoolId, draft), onSuccess: () => { toast.success("Rules saved."); onSaved(); }, onError: (e) => setError(errorText(e)) });
  const toggle = (key: keyof ReadinessReport["policy"], label: string) => (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={draft[key] as boolean} onChange={(e) => setDraft({ ...draft, [key]: e.target.checked })} />
      {label}
    </label>
  );
  const percent = (key: "minStaffProfilesApprovedPercent" | "minStudentProfilesApprovedPercent" | "minAccountsActivatedPercent", label: string) => (
    <div className="space-y-1">
      <label htmlFor={key} className="text-sm font-medium">{label}</label>
      <Input id={key} type="number" min={0} max={100} value={draft[key]} onChange={(e) => setDraft({ ...draft, [key]: Number(e.target.value) })} />
    </div>
  );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Readiness rules</DialogTitle>
          <DialogDescription>What this school must have before it can be marked ready. Saving a change clears an existing "marked ready".</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {toggle("requireCurrentYear", "A current academic year is set")}
          {toggle("requireStructure", "Classes and sections exist")}
          {toggle("requireStaffAndStudents", "Staff and students are imported")}
          {toggle("requireClassTeachers", "Every section has a class teacher")}
          {percent("minStaffProfilesApprovedPercent", "Staff profiles approved (%)")}
          {percent("minStudentProfilesApprovedPercent", "Student profiles approved (%)")}
          {percent("minAccountsActivatedPercent", "Invited people who have set a password (%)")}
          <FormErrorBanner message={error} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={() => save.mutate()} loading={save.isPending}>Save rules</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
