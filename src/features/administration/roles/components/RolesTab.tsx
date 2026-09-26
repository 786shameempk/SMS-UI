import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, ShieldCheck, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createRole, deleteRole, getRoleUserCounts, listRoles, updateRole } from "../api";
import type { Role, RoleFormValues } from "../types";
import RoleFormDialog from "./RoleFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function RolesTab() {
  const queryClient = useQueryClient();
  const { data: roles = [], isLoading, isError, refetch } = useQuery({ queryKey: ["admin", "roles"], queryFn: listRoles });
  const { data: userCounts = {} } = useQuery({ queryKey: ["admin", "roles", "user-counts"], queryFn: getRoleUserCounts });

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "roles"] });

  const createMutation = useMutation({
    mutationFn: createRole,
    onSuccess: () => {
      invalidate();
      toast.success("Role created");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create role"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: RoleFormValues }) => updateRole(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Role updated");
      setFormOpen(false);
      setEditingRole(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update role"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => {
      invalidate();
      toast.success(`${deleteTarget?.name} deleted`);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete role"),
  });

  const columns: ColumnDef<Role, unknown>[] = [
    {
      accessorKey: "name",
      header: "Role",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground">{row.original.name}</span>
          {row.original.isSystem && (
            <Badge variant="info" className="gap-1">
              <ShieldCheck className="w-3 h-3" />
              Built-in
            </Badge>
          )}
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.description}</span>,
    },
    {
      id: "users",
      header: "Users",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground tabular-nums">{userCounts[row.original.id] ?? 0}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const role = row.original;
        // Built-in roles are shared by every school on the platform, so they're read-only here.
        if (role.isSystem) return null;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditingRole(role);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit role
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => setDeleteTarget(role)}
              variant="destructive"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete role
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{roles.length} roles defined</p>
        <Button
          onClick={() => {
            setEditingRole(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add role
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={roles} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No roles yet." />

      <RoleFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingRole(null);
        }}
        role={editingRole}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingRole) await updateMutation.mutateAsync({ id: editingRole.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete role"
        description={`This will permanently remove the "${deleteTarget?.name}" role and its permission assignments.`}
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
