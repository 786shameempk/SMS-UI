import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, Pencil, Trash2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { defaultBranchIdForTenant, getCurrentTenantId } from "@/utils/tenant";
import { createBranch, deleteBranch, listBranches, updateBranch } from "../api";
import type { Branch, BranchFormValues } from "../types";
import BranchFormDialog from "./BranchFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function BranchesTab() {
  const { t } = useTranslation("administration");
  const queryClient = useQueryClient();
  const { data: branches = [], isLoading, isError, refetch } = useQuery({ queryKey: ["admin", "branches"], queryFn: listBranches });

  const [formOpen, setFormOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "branches"] });

  const createMutation = useMutation({
    mutationFn: createBranch,
    onSuccess: () => {
      invalidate();
      toast.success(t("Branch added"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not add branch")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BranchFormValues }) => updateBranch(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Branch updated"));
      setFormOpen(false);
      setEditingBranch(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update branch")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBranch(id),
    onSuccess: () => {
      invalidate();
      toast.success(t("{{name}} deleted", { name: deleteTarget?.name }));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not delete branch")),
  });

  const mainBranchId = defaultBranchIdForTenant(getCurrentTenantId());

  const columns: ColumnDef<Branch, unknown>[] = [
    {
      accessorKey: "name",
      header: t("Branch"),
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">{row.original.name}</span>
          {row.original.id === mainBranchId && <Badge variant="info">{t("Main campus")}</Badge>}
        </div>
      ),
    },
    { accessorKey: "code", header: t("Code"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.code}</span> },
    { accessorKey: "address", header: t("Address"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.address || "—"}</span> },
    {
      accessorKey: "status",
      header: t("Status"),
      cell: ({ row }) => <StatusBadge status={row.original.status === "active" ? "active" : "inactive"} />,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const branch = row.original;
        const isMain = branch.id === mainBranchId;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditingBranch(branch);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit branch")}
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={isMain}
              onClick={() => setDeleteTarget(branch)}
              variant="destructive" className="data-[disabled]:text-muted-foreground/70"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t("Delete branch")}
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{branches.length === 1 ? t("{{count}} branch", { count: branches.length }) : t("{{count}} branches", { count: branches.length })}</p>
        <Button
          onClick={() => {
            setEditingBranch(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          {t("Add branch")}
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={branches} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No branches yet.")} />

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
        title={t("Delete branch")}
        description={t("This will permanently remove the \"{{name}}\" branch. Records already assigned to it are not moved or deleted.", { name: deleteTarget?.name })}
        confirmLabel={t("Delete")}
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
