import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Mail, Power, UserPlus, UserRoundCog } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { FormErrorBanner } from "./kit";
import { Field, ReasonDialog, StatusBadge } from "./salesKit";
import { addSchoolAdmin, changeSchoolAdminEmail, replaceSchoolAdmin, resetSchoolAdminPassword, schoolAdmins, setSchoolAdminActive } from "../api/sales";
import { ago, errorText } from "../helpers";
import type { SchoolAdmin } from "../salesTypes";

type Action =
  | { kind: "reset" | "deactivate" | "activate"; admin: SchoolAdmin }
  | { kind: "email" | "replace"; admin: SchoolAdmin }
  | { kind: "add" };

/** The school's administrator accounts: who they are, and the actions that keep a school reachable. Every action needs a reason. */
export function SchoolAdminsTab({ schoolId, canControl }: { schoolId: string; canControl: boolean }) {
  const qc = useQueryClient();
  const admins = useQuery({ queryKey: ["office", "school-admins", schoolId], queryFn: () => schoolAdmins(schoolId) });
  const [action, setAction] = useState<Action | null>(null);
  const [error, setError] = useState<string | null>(null);
  const close = () => {
    setAction(null);
    setError(null);
  };
  const done = (message: string) => {
    toast.success(message);
    close();
    void qc.invalidateQueries({ queryKey: ["office"] });
  };
  const fail = (e: unknown) => setError(errorText(e));

  const reset = useMutation({
    mutationFn: (v: { admin: SchoolAdmin; reason: string }) => resetSchoolAdminPassword(schoolId, v.admin.id, v.reason),
    onSuccess: () => done("A new temporary password was emailed."),
    onError: fail,
  });
  const active = useMutation({
    mutationFn: (v: { admin: SchoolAdmin; active: boolean; reason: string }) => setSchoolAdminActive(schoolId, v.admin.id, v.active, v.reason),
    onSuccess: (a) => done(a.isActive ? "Administrator reactivated." : "Administrator deactivated and signed out."),
    onError: fail,
  });

  if (admins.isLoading) return <Skeleton className="h-32 rounded-xl" />;
  if (admins.isError) return <ErrorState onRetry={() => admins.refetch()} retrying={admins.isRefetching} />;

  return (
    <div className="space-y-3">
      {canControl && (
        <Button variant="outline" onClick={() => setAction({ kind: "add" })}>
          <UserPlus className="h-4 w-4" aria-hidden="true" />
          Add administrator
        </Button>
      )}
      {admins.data!.length === 0 ? (
        <EmptyState title="No administrator yet" description="Add one so the school can sign in." />
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card" aria-label="Administrators">
          {admins.data!.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{a.name || a.email}</p>
                <p className="text-xs text-muted-foreground">{a.email} · {a.lastLoginAt ? `signed in ${ago(a.lastLoginAt)}` : "never signed in"}</p>
              </div>
              <StatusBadge status={a.isActive ? "Active" : "Suspended"}>{a.isActive ? "Active" : "Deactivated"}</StatusBadge>
              {a.mustChangePassword && <StatusBadge status="Pending">Temporary password</StatusBadge>}
              {a.locked && <StatusBadge status="Failed">Locked</StatusBadge>}
              {canControl && (
                <span className="flex flex-wrap gap-1">
                  <Button size="sm" variant="ghost" aria-label={`Reset password for ${a.email}`} onClick={() => setAction({ kind: "reset", admin: a })}><KeyRound className="h-4 w-4" aria-hidden="true" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Change email for ${a.email}`} onClick={() => setAction({ kind: "email", admin: a })}><Mail className="h-4 w-4" aria-hidden="true" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Replace ${a.email}`} onClick={() => setAction({ kind: "replace", admin: a })}><UserRoundCog className="h-4 w-4" aria-hidden="true" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`${a.isActive ? "Deactivate" : "Reactivate"} ${a.email}`} onClick={() => setAction({ kind: a.isActive ? "deactivate" : "activate", admin: a })}><Power className="h-4 w-4" aria-hidden="true" /></Button>
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <ReasonDialog
        open={action?.kind === "reset"}
        title="Reset password"
        description={action && "admin" in action ? `Emails ${action.admin.email} a new temporary password and signs them out everywhere.` : ""}
        confirmLabel="Reset password"
        busy={reset.isPending}
        error={error}
        onClose={close}
        onConfirm={(reason) => action && "admin" in action && reset.mutate({ admin: action.admin, reason })}
      />
      <ReasonDialog
        open={action?.kind === "deactivate" || action?.kind === "activate"}
        title={action?.kind === "activate" ? "Reactivate administrator" : "Deactivate administrator"}
        description={action?.kind === "activate" ? "They can sign in again with their existing password." : "They are signed out now and cannot sign in. The school's only active administrator cannot be deactivated."}
        confirmLabel={action?.kind === "activate" ? "Reactivate" : "Deactivate"}
        destructive={action?.kind === "deactivate"}
        busy={active.isPending}
        error={error}
        onClose={close}
        onConfirm={(reason) => action && "admin" in action && active.mutate({ admin: action.admin, active: action.kind === "activate", reason })}
      />
      {action?.kind === "email" && <EmailDialog schoolId={schoolId} admin={action.admin} onClose={close} onDone={() => done("Email changed; a new temporary password was sent to it.")} />}
      {action?.kind === "add" && <PersonDialog mode="add" schoolId={schoolId} onClose={close} onDone={() => done("Administrator added and emailed.")} />}
      {action?.kind === "replace" && <PersonDialog mode="replace" schoolId={schoolId} old={action.admin} onClose={close} onDone={() => done("Administrator replaced.")} />}
    </div>
  );
}

function EmailDialog({ schoolId, admin, onClose, onDone }: { schoolId: string; admin: SchoolAdmin; onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({ mutationFn: () => changeSchoolAdminEmail(schoolId, admin.id, email.trim(), reason.trim()), onSuccess: onDone, onError: (e) => setError(errorText(e)) });
  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change sign-in email</DialogTitle>
          <DialogDescription>{admin.email} moves to the new address, is signed out everywhere, and the new address receives a temporary password, so only its owner can get in.</DialogDescription>
        </DialogHeader>
        <Field label="New email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={256} /></Field>
        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => { setError(null); save.mutate(); }} loading={save.isPending} disabled={!email.trim() || !reason.trim()}>Change email</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PersonDialog({ mode, schoolId, old, onClose, onDone }: { mode: "add" | "replace"; schoolId: string; old?: SchoolAdmin; onClose: () => void; onDone: () => void }) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const save = useMutation({
    mutationFn: () =>
      mode === "add"
        ? addSchoolAdmin(schoolId, { email: email.trim(), name: name.trim(), reason: reason.trim() })
        : replaceSchoolAdmin(schoolId, { userId: old!.id, email: email.trim(), name: name.trim(), reason: reason.trim() }),
    onSuccess: onDone,
    onError: (e) => setError(errorText(e)),
  });
  return (
    <Dialog open onOpenChange={(o) => !o && !save.isPending && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "add" ? "Add administrator" : "Replace administrator"}</DialogTitle>
          <DialogDescription>
            {mode === "add" ? "Creates another administrator account and emails them a temporary password." : `Creates the new administrator first, then deactivates ${old?.email} and signs them out.`}
          </DialogDescription>
        </DialogHeader>
        <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} maxLength={150} /></Field>
        <Field label="Email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={256} /></Field>
        <Field label="Reason"><Input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} /></Field>
        <FormErrorBanner message={error} />
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={save.isPending}>Cancel</Button>
          <Button onClick={() => { setError(null); save.mutate(); }} loading={save.isPending} disabled={!email.trim() || !name.trim() || !reason.trim()}>{mode === "add" ? "Add administrator" : "Replace administrator"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
