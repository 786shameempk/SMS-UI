import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { ErrorState } from "@/components/ui/states";
import { Skeleton } from "@/components/ui/skeleton";
import { ConfirmDialog, FormErrorBanner } from "../components/kit";
import { errorText } from "../helpers";
import { deleteOfficeRole, listOfficePermissions, listOfficeRoles, saveOfficeRole } from "../api/team";
import { useHasOfficePermission, useOfficeStore } from "../store";
import type { OfficePermission, OfficeRole } from "../types";

export default function OfficeRolesPage() {
  const qc = useQueryClient();
  const canManage = useHasOfficePermission("roles.manage");
  const roles = useQuery({ queryKey: ["office", "roles"], queryFn: listOfficeRoles });
  const catalog = useQuery({ queryKey: ["office", "permissions"], queryFn: listOfficePermissions, staleTime: Infinity });
  const [editing, setEditing] = useState<OfficeRole | "new" | null>(null);
  const [deleting, setDeleting] = useState<OfficeRole | null>(null);
  const del = useMutation({
    mutationFn: (r: OfficeRole) => deleteOfficeRole(r.id),
    onSuccess: () => {
      toast.success("Role deleted");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["office", "roles"] });
    },
  });

  const labelOf = useMemo(() => new Map(catalog.data?.map((p) => [p.key, p.label]) ?? []), [catalog.data]);

  return (
    <PageContainer>
      <PageHeader
        icon={KeyRound}
        title="Roles & permissions"
        description="What each kind of office user may do. Built-in roles are managed by the platform; create custom roles for anything else."
        actions={
          canManage && (
            <Button onClick={() => setEditing("new")}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              New role
            </Button>
          )
        }
      />
      {roles.isLoading ? (
        <Skeleton className="h-64 rounded-xl" />
      ) : roles.isError ? (
        <ErrorState onRetry={() => roles.refetch()} retrying={roles.isRefetching} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {roles.data!.map((r) => (
            <Card key={r.id} className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="flex items-center gap-2 text-sm font-semibold">
                    {r.name}
                    {r.isSystem && (
                      <Badge variant="neutral">
                        <Lock className="me-1 h-3 w-3" aria-hidden="true" />
                        Built-in
                      </Badge>
                    )}
                  </h2>
                  {r.description && <p className="mt-0.5 text-sm text-muted-foreground">{r.description}</p>}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {r.users} user{r.users === 1 ? "" : "s"}
                </span>
              </div>
              <ul className="flex flex-wrap gap-1.5" aria-label={`${r.name} permissions`}>
                {r.permissions.map((p) => (
                  <li key={p} className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
                    {labelOf.get(p) ?? p}
                  </li>
                ))}
              </ul>
              {canManage && !r.isSystem && (
                <div className="flex gap-2 pt-1">
                  <Button variant="outline" size="sm" onClick={() => setEditing(r)}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setDeleting(r)}>
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Delete
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {editing && catalog.data && <RoleDialog role={editing === "new" ? null : editing} catalog={catalog.data} onClose={() => setEditing(null)} />}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete ${deleting?.name}?`}
        description="The role is removed. People must be moved to another role first."
        confirmLabel="Delete role"
        destructive
        busy={del.isPending}
        error={del.isError ? errorText(del.error) : null}
        onConfirm={() => deleting && del.mutate(deleting)}
        onClose={() => setDeleting(null)}
      />
    </PageContainer>
  );
}

function RoleDialog({ role, catalog, onClose }: { role: OfficeRole | null; catalog: OfficePermission[]; onClose: () => void }) {
  const qc = useQueryClient();
  const myPermissions = useOfficeStore((s) => s.user!.permissions);
  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [selected, setSelected] = useState<Set<string>>(new Set(role?.permissions ?? []));
  const groups = useMemo(() => {
    const map = new Map<string, OfficePermission[]>();
    for (const p of catalog) map.set(p.group, [...(map.get(p.group) ?? []), p]);
    return [...map.entries()];
  }, [catalog]);
  const save = useMutation({
    mutationFn: () => saveOfficeRole(role?.id ?? null, { name, description: description || null, permissions: [...selected] }),
    onSuccess: () => {
      toast.success(role ? "Role updated" : "Role created");
      void qc.invalidateQueries({ queryKey: ["office", "roles"] });
      onClose();
    },
  });
  const toggle = (key: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(key);
      else next.delete(key);
      return next;
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{role ? "Edit role" : "New role"}</DialogTitle>
          <DialogDescription>You can only grant permissions you hold yourself. Everyone on the role picks up changes the next time they sign in or refresh.</DialogDescription>
        </DialogHeader>
        <FormErrorBanner message={save.isError ? errorText(save.error) : null} />
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="role-name">Name</Label>
            <Input id="role-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="role-description">Description</Label>
            <Input id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} />
          </div>
          <div className="max-h-80 space-y-4 overflow-y-auto rounded-lg border border-border p-3">
            {groups.map(([group, items]) => (
              <fieldset key={group}>
                <legend className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</legend>
                <div className="grid gap-1.5 sm:grid-cols-2">
                  {items.map((p) => {
                    const allowed = myPermissions.includes(p.key);
                    return (
                      <label key={p.key} className={`flex items-start gap-2 text-sm ${allowed ? "" : "opacity-50"}`}>
                        <Checkbox checked={selected.has(p.key)} disabled={!allowed && !selected.has(p.key)} onCheckedChange={(v) => toggle(p.key, v === true)} aria-label={p.label} />
                        <span>{p.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={!name.trim() || selected.size === 0}>
            Save role
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
