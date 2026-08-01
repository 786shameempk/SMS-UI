import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { DataTableToolbar } from "@/components/tables/DataTable";
import { createPolicy, deletePolicy, listPolicies, listRoles, setPolicyEnabled, updatePolicy } from "../api";
import type { Policy, PolicyFormValues } from "../types";
import PolicyFormDialog from "./PolicyFormDialog";

export default function PoliciesTab() {
  const queryClient = useQueryClient();
  const { data: policies = [], isLoading } = useQuery({ queryKey: ["admin", "policies"], queryFn: listPolicies });
  const { data: roles = [] } = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles });

  const [formOpen, setFormOpen] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<Policy | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Policy | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "policies"] });

  const createMutation = useMutation({
    mutationFn: createPolicy,
    onSuccess: () => {
      invalidate();
      toast.success("Policy created");
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: PolicyFormValues }) => updatePolicy(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Policy updated");
      setFormOpen(false);
      setEditingPolicy(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: () => {
      invalidate();
      toast.success(`${deleteTarget?.name} deleted`);
      setDeleteTarget(null);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) => setPolicyEnabled(id, enabled),
    onSuccess: () => invalidate(),
  });

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? id;

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">
          Policies apply attribute-based conditions on top of role permissions.
        </p>
        <Button
          onClick={() => {
            setEditingPolicy(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add policy
        </Button>
      </DataTableToolbar>

      {isLoading && <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />}

      <div className="space-y-3">
        {policies.map((policy) => (
          <Card key={policy.id}>
            <CardContent className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-900">{policy.name}</p>
                  <Badge variant="neutral">{policy.module}</Badge>
                </div>
                <p className="text-sm text-slate-600">{policy.description}</p>
                <code className="inline-block text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-1 text-slate-600">
                  {policy.condition}
                </code>
                <div className="flex items-center gap-1.5 flex-wrap pt-1">
                  {policy.roleIds.map((id) => (
                    <Badge key={id} variant="info">
                      {roleName(id)}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Switch
                  checked={policy.enabled}
                  onCheckedChange={(v) => toggleMutation.mutate({ id: policy.id, enabled: v })}
                  aria-label={`Enable ${policy.name}`}
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingPolicy(policy);
                        setFormOpen(true);
                      }}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit policy
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDeleteTarget(policy)}
                      className="text-red-600 focus:bg-red-50 focus:text-red-700"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete policy
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
        {!isLoading && policies.length === 0 && <p className="text-sm text-muted-foreground">No policies defined yet.</p>}
      </div>

      <PolicyFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingPolicy(null);
        }}
        policy={editingPolicy}
        roles={roles}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingPolicy) await updateMutation.mutateAsync({ id: editingPolicy.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete policy"
        description={`This will remove the "${deleteTarget?.name}" policy.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
