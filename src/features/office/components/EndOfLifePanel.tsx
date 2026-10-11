import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, RotateCcw, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReasonDialog, StatusBadge } from "./salesKit";
import { decideErasure, downloadSchoolExport, latestErasure, requestErasure, restoreSubscription, withdrawErasure } from "../api/sales";
import { dateTime, day, errorText } from "../helpers";
import { useHasOfficePermission } from "../store";
import type { Subscription } from "../salesTypes";

type Dialog = "restore" | "request" | "refuse" | "approve" | null;

/**
 * What happens to a school's data after it leaves: download it, restore the subscription while the data is still kept, and after the
 * retention period erase the accounts with two people (one asks, a different one approves). Erasure covers what the sign-in service
 * holds; the other services' records are not touched, and the screen says so.
 */
export function EndOfLifePanel({ s }: { s: Subscription }) {
  const qc = useQueryClient();
  const canControl = useHasOfficePermission("tenants.control");
  const canDelete = useHasOfficePermission("tenants.delete");
  const [dialog, setDialog] = useState<Dialog>(null);
  const [error, setError] = useState<string | null>(null);
  const request = useQuery({ queryKey: ["office", "erasure", s.schoolId], queryFn: () => latestErasure(s.schoolId) });
  const done = (message: string) => {
    toast.success(message);
    setDialog(null);
    setError(null);
    void qc.invalidateQueries({ queryKey: ["office"] });
  };
  const fail = (e: unknown) => setError(errorText(e));

  const download = useMutation({ mutationFn: () => downloadSchoolExport(s.schoolId), onError: (e) => toast.error(errorText(e)) });
  const restore = useMutation({ mutationFn: (reason: string) => restoreSubscription(s.id, reason), onSuccess: () => done("Subscription restored. The school stays suspended until you reactivate it."), onError: fail });
  const ask = useMutation({ mutationFn: (reason: string) => requestErasure(s.schoolId, reason), onSuccess: () => done("Erasure requested. A colleague must approve it."), onError: fail });
  const withdraw = useMutation({ mutationFn: (id: string) => withdrawErasure(id), onSuccess: () => done("Request withdrawn."), onError: (e) => toast.error(errorText(e)) });
  const decide = useMutation({
    mutationFn: (v: { id: string; approve: boolean; note: string | null }) => decideErasure(v.id, v.approve, v.note),
    onSuccess: (r) => done(r.status === "Executed" ? "The school's accounts were erased." : "Request refused."),
    onError: fail,
  });

  const cancelled = s.status === "Cancelled";
  const erased = !!s.dataErasedAt;
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const keeping = cancelled && !!s.dataRetentionUntil && s.dataRetentionUntil >= today;
  const pending = request.data?.status === "Pending" ? request.data : null;

  if (request.isLoading) return <Skeleton className="h-32 rounded-xl" />;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 text-sm">
        {erased ? (
          <p className="flex items-center gap-2"><StatusBadge status="Cancelled">Erased</StatusBadge>The school's accounts were erased on {dateTime(s.dataErasedAt!)}. Its invoices and payments are kept.</p>
        ) : cancelled ? (
          <p>{keeping ? <>This school's data is kept until <strong>{day(s.dataRetentionUntil)}</strong>. Until then you can download it or restore the subscription.</> : <>The retention period ended on <strong>{day(s.dataRetentionUntil)}</strong>. The accounts can now be erased, with a second person's approval.</>}</p>
        ) : (
          <p>The subscription is {s.status.toLowerCase()}. When it is cancelled, the school's data is kept for the retention period before anything can be erased.</p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canControl && !erased && (
          <Button variant="outline" onClick={() => download.mutate()} loading={download.isPending}>
            <Download className="h-4 w-4" aria-hidden="true" />
            Download account data
          </Button>
        )}
        {canControl && keeping && (
          <Button variant="outline" onClick={() => setDialog("restore")}>
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Restore subscription
          </Button>
        )}
        {canControl && cancelled && !keeping && !erased && !pending && (
          <Button variant="outline" onClick={() => setDialog("request")}>
            <ShieldAlert className="h-4 w-4" aria-hidden="true" />
            Request erasure
          </Button>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        The download and the erasure cover what the sign-in service holds: accounts, branches and roles. Student, staff, fee, attendance, messaging, meeting and AI records live in their own services and are not part of either.
      </p>

      {pending && (
        <section aria-label="Erasure request" className="space-y-2 rounded-xl border border-destructive/30 bg-destructive-soft/40 p-4 text-sm">
          <p className="font-medium">Erasure requested by {pending.requestedByName ?? "a colleague"} · {dateTime(pending.requestedAt)}</p>
          <p>{pending.reason}</p>
          <p className="text-muted-foreground">Approving anonymises every account of this school and ends all sessions. It cannot be undone.</p>
          <div className="flex flex-wrap gap-2">
            {canDelete && pending.canDecide && <Button variant="destructive" onClick={() => setDialog("approve")}>Approve and erase</Button>}
            {canDelete && pending.canDecide && <Button variant="outline" onClick={() => setDialog("refuse")}>Refuse</Button>}
            {canDelete && !pending.canDecide && <span className="text-muted-foreground">You requested this, so a colleague who can approve erasure must decide it.</span>}
            {canControl && <Button variant="ghost" onClick={() => withdraw.mutate(pending.id)} loading={withdraw.isPending}>Withdraw request</Button>}
          </div>
        </section>
      )}
      {request.data && request.data.status !== "Pending" && (
        <p className="text-xs text-muted-foreground">
          Last request: {request.data.status.toLowerCase()}
          {request.data.decidedByName ? ` by ${request.data.decidedByName}` : ""}
          {request.data.decisionNote ? ` (${request.data.decisionNote})` : ""}. {request.data.result}
        </p>
      )}

      <ReasonDialog open={dialog === "restore"} title="Restore subscription" description="The school is suspended, not active: nobody can sign in until you reactivate it." confirmLabel="Restore" busy={restore.isPending} error={error} onClose={() => { setDialog(null); setError(null); }} onConfirm={(r) => restore.mutate(r)} />
      <ReasonDialog open={dialog === "request"} title="Request erasure" description="Asks a colleague to approve erasing this school's accounts. Nothing happens until they do." confirmLabel="Request erasure" busy={ask.isPending} error={error} onClose={() => { setDialog(null); setError(null); }} onConfirm={(r) => ask.mutate(r)} />
      <ReasonDialog open={dialog === "refuse"} title="Refuse erasure" description="The request is closed and the data stays." confirmLabel="Refuse" label="Why?" busy={decide.isPending} error={error} onClose={() => { setDialog(null); setError(null); }} onConfirm={(note) => pending && decide.mutate({ id: pending.id, approve: false, note })} />
      <ReasonDialog open={dialog === "approve"} title="Erase this school's accounts" description="Every account becomes an anonymous, deleted record and all sessions end. This cannot be undone. Other services' records are not touched." confirmLabel="Erase accounts" destructive label="Confirmation note" busy={decide.isPending} error={error} onClose={() => { setDialog(null); setError(null); }} onConfirm={(note) => pending && decide.mutate({ id: pending.id, approve: true, note })} />
    </div>
  );
}
