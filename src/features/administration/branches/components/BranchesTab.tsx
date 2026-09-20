import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, MoreHorizontal, Pencil, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { defaultBranchIdForTenant, getCurrentTenantId } from "@/utils/tenant";
import { createBranch, deleteBranch, listBranches, updateBranch } from "../api";
import type { Branch, BranchFormValues } from "../types";
import BranchFormDialog from "./BranchFormDialog";

export default function BranchesTab() {
  const queryClient = useQueryClient();
  const { data: branches = [], isLoading } = useQuery({ queryKey: ["admin", "branches"], queryFn: listBranches });

  const [formOpen, setFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      invalidate();
      toast.success("Branch added");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add branch"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BranchFormValues }) => updateBranch(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Branch updated");
      setFormOpen(false);
      setEditingBranch(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update branch"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      invalidate();
      toast.success(`${deleteTarget?.name} deleted`);
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete branch"),
  });

  const mainBranchId = defaultBranchIdForTenant(getCurrentTenantId());

  const columns: ColumnDef<Branch, unknown>[] = [
    {
      accessorKey: "name",
      header: "Branch",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-slate-800">{row.original.name}</span>
          {row.original.id === mainBranchId && <Badge variant="info">Main campus</Badge>}
        </div>
      ),
    },
    { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.code}</span> },
    { accessorKey: "address", header: "Address", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.address || "—"}</span> },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={row.original.status === "active" ? "success" : "neutral"}>{row.original.status === "active" ? "Active" : "Inactive"}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const branch = row.original;
        const isMain = branch.id === mainBranchId;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => {
                  setEditingBranch(branch);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit branch
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={isMain}
                onClick={() => setDeleteTarget(branch)}
                className="text-red-600 focus:bg-red-50 focus:text-red-700 data-[disabled]:text-slate-300"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete branch
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{branches.length} branch{branches.length === 1 ? "" : "es"}</p>
        <Button
          onClick={() => {
            setEditingBranch(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add branch
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={branches} isLoading={isLoading} emptyMessage="No branches yet." />

      <BranchFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditingBranch(null);
        }}
        branch={editingBranch}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingBranch) await updateMutation.mutateAsync({ id: editingBranch.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete branch"
        description={`This will permanently remove the "${deleteTarget?.name}" branch. Records already assigned to it are not moved or deleted.`}
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
