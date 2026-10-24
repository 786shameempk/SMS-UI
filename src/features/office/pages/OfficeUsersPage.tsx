import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, MoreHorizontal, ShieldOff, UserPlus, Users } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ConfirmDialog, FormErrorBanner, Pager } from "../components/kit";
import { ago, errorText, useDebounced, dateTime } from "../helpers";
import {
  inviteOfficeUser,
  listOfficeRoles,
  listOfficeUserSessions,
  listOfficeUsers,
  officeUserHistory,
  resendOfficeInvite,
  resetOfficeUserPassword,
  revokeOfficeUserSessions,
  updateOfficeUser,
} from "../api/team";
import { useHasOfficePermission, useOfficeStore } from "../store";
import type { OfficeUserListItem } from "../types";

type Action =
  | { kind: "deactivate" | "activate" | "reset" | "revoke" | "resend"; user: OfficeUserListItem }
  | { kind: "role"; user: OfficeUserListItem }
  | { kind: "details"; user: OfficeUserListItem };

export default function OfficeUsersPage() {
  const qc = useQueryClient();
  const canManage = useHasOfficePermission("users.manage");
  const me = useOfficeStore((s) => s.user)!;
  const [search, setSearch] = useState("");
  const [roleId, setRoleId] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [inviting, setInviting] = useState(false);
  const [action, setAction] = useState<Action | null>(null);
  const q = useDebounced(search);

  const roles = useQuery({ queryKey: ["office", "roles"], queryFn: listOfficeRoles });
  const users = useQuery({
    queryKey: ["office", "users", q, roleId, status, page],
    queryFn: () => listOfficeUsers({ search: q, roleId: roleId === "all" ? undefined : roleId, status: status === "all" ? undefined : status, page, pageSize: 20 }),
    placeholderData: (prev) => prev,
  });
  const invalidate = () => qc.invalidateQueries({ queryKey: ["office", "users"] });

  return (
    <PageContainer>
      <PageHeader
        icon={Users}
        title="Office users"
        description="The School Sphere team members who can sign in to this portal."
        actions={
          canManage && (
            <Button onClick={() => setInviting(true)}>
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Invite user
            </Button>
          )
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input aria-label="Search users" placeholder="Search name or email" className="w-64" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select value={roleId} onValueChange={(v) => { setRoleId(v); setPage(1); }}>
          <SelectTrigger className="w-48" aria-label="Filter by role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            {roles.data?.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
          <SelectTrigger className="w-40" aria-label="Filter by status">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="invited">Invited</SelectItem>
            <SelectItem value="inactive">Deactivated</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {users.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : users.isError ? (
        <ErrorState onRetry={() => users.refetch()} retrying={users.isRefetching} />
      ) : users.data!.items.length === 0 ? (
        <EmptyState icon={Users} title="No office users match" description="Try a different search or filter." />
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>MFA</TableHead>
                  <TableHead>Last sign-in</TableHead>
                  <TableHead className="text-end">Sessions</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.data!.items.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">{u.displayName}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell>{u.role}</TableCell>
                    <TableCell>
                      <Badge variant={!u.isActive ? "neutral" : u.invitationPending ? "warning" : "success"}>{!u.isActive ? "Deactivated" : u.invitationPending ? "Invited" : "Active"}</Badge>
                    </TableCell>
                    <TableCell>{u.mfaEnabled ? <Badge variant="success">On</Badge> : <Badge variant="neutral">Off</Badge>}</TableCell>
                    <TableCell className="text-muted-foreground">{ago(u.lastLoginAt)}</TableCell>
                    <TableCell className="text-end tabular-nums">{u.activeSessions}</TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" aria-label={`Actions for ${u.displayName}`}>
                            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => setAction({ kind: "details", user: u })}>Sessions &amp; access history</DropdownMenuItem>
                          {canManage && u.id !== me.id && (
                            <>
                              <DropdownMenuItem onSelect={() => setAction({ kind: "role", user: u })}>Change role</DropdownMenuItem>
                              {u.invitationPending ? (
                                <DropdownMenuItem onSelect={() => setAction({ kind: "resend", user: u })}>Resend invitation</DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem onSelect={() => setAction({ kind: "reset", user: u })}>Send password reset</DropdownMenuItem>
                              )}
                              <DropdownMenuItem onSelect={() => setAction({ kind: "revoke", user: u })}>Revoke sessions</DropdownMenuItem>
                              <DropdownMenuItem onSelect={() => setAction({ kind: u.isActive ? "deactivate" : "activate", user: u })}>{u.isActive ? "Deactivate" : "Reactivate"}</DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <Pager page={users.data!.pageNumber} totalPages={users.data!.totalPages} totalCount={users.data!.totalCount} onPage={setPage} noun="user" />
        </>
      )}

      {inviting && <InviteDialog onClose={() => setInviting(false)} onDone={invalidate} />}
      {action && <ActionDialog action={action} onClose={() => setAction(null)} onDone={invalidate} />}
    </PageContainer>
  );
}

function InviteDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const roles = useQuery({ queryKey: ["office", "roles"], queryFn: listOfficeRoles });
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const invite = useMutation({
    mutationFn: () => inviteOfficeUser({ email, displayName: name, roleId }),
    onSuccess: () => {
      toast.success("Invitation sent");
      onDone();
      onClose();
    },
  });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite an office user</DialogTitle>
          <DialogDescription>They receive an email link to choose their own password. You can only assign roles whose permissions you hold yourself.</DialogDescription>
        </DialogHeader>
        <FormErrorBanner message={invite.isError ? errorText(invite.error) : null} />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="invite-name">Full name</Label>
            <Input id="invite-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-email">Work email</Label>
            <Input id="invite-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="invite-role">Role</Label>
            <Select value={roleId} onValueChange={setRoleId}>
              <SelectTrigger id="invite-role">
                <SelectValue placeholder="Choose a role" />
              </SelectTrigger>
              <SelectContent>
                {roles.data?.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => invite.mutate()} loading={invite.isPending} disabled={!email || !name || !roleId}>
            <Mail className="h-4 w-4" aria-hidden="true" />
            Send invitation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ActionDialog({ action, onClose, onDone }: { action: Action; onClose: () => void; onDone: () => void }) {
  const { user } = action;
  const roles = useQuery({ queryKey: ["office", "roles"], queryFn: listOfficeRoles, enabled: action.kind === "role" });
  const [roleId, setRoleId] = useState(user.roleId);

  const mutation = useMutation({
    mutationFn: async () => {
      switch (action.kind) {
        case "deactivate":
          return updateOfficeUser(user.id, { isActive: false });
        case "activate":
          return updateOfficeUser(user.id, { isActive: true });
        case "role":
          return updateOfficeUser(user.id, { roleId });
        case "reset":
          return resetOfficeUserPassword(user.id);
        case "revoke":
          return revokeOfficeUserSessions(user.id);
        case "resend":
          return resendOfficeInvite(user.id);
        default:
          return undefined;
      }
    },
    onSuccess: () => {
      toast.success("Done");
      onDone();
      onClose();
    },
  });
  const error = mutation.isError ? errorText(mutation.error) : null;

  if (action.kind === "details") return <DetailsDialog user={user} onClose={onClose} />;

  const copy: Record<string, { title: string; text: string; label: string; destructive?: boolean }> = {
    deactivate: { title: `Deactivate ${user.displayName}?`, text: "They are signed out immediately and cannot sign in until you reactivate them. Their history is kept.", label: "Deactivate", destructive: true },
    activate: { title: `Reactivate ${user.displayName}?`, text: "They will be able to sign in again with their existing password.", label: "Reactivate" },
    reset: { title: "Send a password reset?", text: `A reset link is emailed to ${user.email}. Their current password keeps working until they use it.`, label: "Send link" },
    revoke: { title: "Revoke all sessions?", text: `${user.displayName} is signed out on every device and must sign in again.`, label: "Revoke sessions", destructive: true },
    resend: { title: "Resend the invitation?", text: `A new link is emailed to ${user.email}; the previous link stops working.`, label: "Resend" },
    role: { title: `Change role for ${user.displayName}`, text: "Their access changes at once and they are signed out so the new permissions apply.", label: "Change role" },
  };
  const c = copy[action.kind];
  return (
    <ConfirmDialog open title={c.title} description={c.text} confirmLabel={c.label} destructive={c.destructive} busy={mutation.isPending} error={error} onConfirm={() => mutation.mutate()} onClose={onClose}>
      {action.kind === "role" && (
        <div className="space-y-1.5">
          <Label htmlFor="change-role">Role</Label>
          <Select value={roleId} onValueChange={setRoleId}>
            <SelectTrigger id="change-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {roles.data?.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </ConfirmDialog>
  );
}

function DetailsDialog({ user, onClose }: { user: OfficeUserListItem; onClose: () => void }) {
  const sessions = useQuery({ queryKey: ["office", "sessions", user.id], queryFn: () => listOfficeUserSessions(user.id) });
  const history = useQuery({ queryKey: ["office", "history", user.id], queryFn: () => officeUserHistory(user.id) });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{user.displayName}</DialogTitle>
          <DialogDescription>{user.email}</DialogDescription>
        </DialogHeader>
        <section aria-label="Active sessions">
          <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <ShieldOff className="h-4 w-4" aria-hidden="true" /> Active sessions
          </h3>
          {sessions.data?.length ? (
            <ul className="space-y-1 text-sm">
              {sessions.data.map((s) => (
                <li key={s.sessionId} className="rounded-md bg-muted px-3 py-2">
                  Since {dateTime(s.startedAt)} · {s.ipAddress ?? "unknown address"}
                  <span className="block truncate text-xs text-muted-foreground">{s.userAgent}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No active sessions.</p>
          )}
        </section>
        <section aria-label="Access history">
          <h3 className="mb-2 text-sm font-semibold">Recent access history</h3>
          {history.data?.items.length ? (
            <ul className="max-h-64 space-y-1 overflow-y-auto text-sm">
              {history.data.items.map((h) => (
                <li key={h.id} className="flex flex-wrap justify-between gap-2 border-b border-border/60 py-1.5">
                  <span>
                    {h.action} <Badge variant={h.outcome === "Success" ? "success" : "danger"}>{h.outcome}</Badge>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {dateTime(h.occurredAt)} · {h.ipAddress ?? "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>
          )}
        </section>
      </DialogContent>
    </Dialog>
  );
}
