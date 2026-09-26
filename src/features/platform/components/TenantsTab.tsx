import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, PauseCircle, PlayCircle, Plus, ShieldCheck, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatRelativeDay } from "@/utils/format";
import { TENANT_STATUS_CONFIG } from "../constants";
import { activateTenant, cancelTenant, createTenant, deleteTenant, listTenants, suspendTenant, updateTenantPlan } from "../api";
import type { TenantRow } from "../types";
import TenantFormDialog from "./TenantFormDialog";
import ChangePlanDialog from "./ChangePlanDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function TenantsTab() {
  const queryClient = useQueryClient();
  const { data: tenants = [], isLoading, isError, refetch } = useQuery({ queryKey: ["platform", "tenants"], queryFn: listTenants });
  const [formOpen, setFormOpen] = useState(false);
  const [planTarget, setPlanTarget] = useState<TenantRow | null>(null);
  const [cancelTarget, setCancelTarget] = useState<TenantRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TenantRow | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["platform"] });

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: (tenant) => {
      invalidate();
      toast.success(`${tenant.schoolName} onboarded as a trial tenant`);
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create tenant"),
  });

  const planMutation = useMutation({
    mutationFn: ({ id, planId }: { id: string; planId: string }) => updateTenantPlan(id, planId),
    onSuccess: () => {
      invalidate();
      toast.success("Plan updated");
      setPlanTarget(null);
    },
  });

  const activateMutation = useMutation({
    mutationFn: activateTenant,
    onSuccess: () => {
      invalidate();
      toast.success("Tenant activated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not activate tenant"),
  });

  const suspendMutation = useMutation({
    mutationFn: suspendTenant,
    onSuccess: () => {
      invalidate();
      toast.success("Tenant suspended");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not suspend tenant"),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelTenant,
    onSuccess: () => {
      invalidate();
      toast.success("Tenant cancelled");
      setCancelTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not cancel tenant"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      invalidate();
      toast.success("Tenant deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete tenant"),
  });

  const columns: ColumnDef<TenantRow, unknown>[] = [
    {
      id: "school",
      header: "School",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground flex items-center gap-1.5">
            {row.original.schoolName}
            {row.original.isCurrentEnvironment && (
              <span title="The tenant you currently have selected">
                <ShieldCheck className="w-3.5 h-3.5 text-primary-text" />
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground">{row.original.subdomain}.educore.app</p>
        </div>
      ),
    },
    {
      id: "plan",
      header: "Plan",
      cell: ({ row }) => <Badge variant="info">{row.original.plan.name}</Badge>,
    },
    {
      id: "students",
      header: "Students",
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">{row.original.studentCount}</span>,
    },
    {
      id: "staff",
      header: "Staff",
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">{row.original.staffCount}</span>,
    },
    {
      id: "storage",
      header: "Storage",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground tabular-nums">
          {row.original.plan.storageGb} GB quota
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Onboarded",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{formatRelativeDay(row.original.createdAt)}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={TENANT_STATUS_CONFIG[row.original.status].variant}>{TENANT_STATUS_CONFIG[row.original.status].label}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const t = row.original;
        return (
          <RowActions>
            <DropdownMenuItem onClick={() => setPlanTarget(t)}>
              <CreditCard className="w-3.5 h-3.5" />
              Change plan
            </DropdownMenuItem>
            {(t.status === "trial" || t.status === "suspended") && (
              <DropdownMenuItem onClick={() => activateMutation.mutate(t.id)}>
                <PlayCircle className="w-3.5 h-3.5" />
                Activate
              </DropdownMenuItem>
            )}
            {t.status === "active" && !t.isCurrentEnvironment && (
              <DropdownMenuItem onClick={() => suspendMutation.mutate(t.id)}>
                <PauseCircle className="w-3.5 h-3.5" />
                Suspend
              </DropdownMenuItem>
            )}
            {!t.isCurrentEnvironment && t.status !== "cancelled" && (
              <DropdownMenuItem onClick={() => setCancelTarget(t)} variant="destructive">
                <XCircle className="w-3.5 h-3.5" />
                Cancel subscription
              </DropdownMenuItem>
            )}
            {!t.isCurrentEnvironment && (
              <DropdownMenuItem onClick={() => setDeleteTarget(t)} variant="destructive">
                <Trash2 className="w-3.5 h-3.5" />
                Delete tenant
              </DropdownMenuItem>
            )}
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground max-w-md">
          Only <strong>EduCore School</strong> reflects this environment's real data — the other tenants are illustrative, with their own seeded stats.
        </p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          New tenant
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={tenants} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No tenants yet." pageSize={10} />

      <TenantFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <ChangePlanDialog
        tenant={planTarget}
        open={Boolean(planTarget)}
        onOpenChange={(v) => !v && setPlanTarget(null)}
        submitting={planMutation.isPending}
        onSubmit={async (planId) => {
          if (planTarget) await planMutation.mutateAsync({ id: planTarget.id, planId });
        }}
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        onOpenChange={(v) => !v && setCancelTarget(null)}
        title="Cancel subscription"
        description={`Cancel ${cancelTarget?.schoolName}'s subscription? They'll lose access until reactivated on a new plan.`}
        confirmLabel="Cancel subscription"
        confirmVariant="destructive"
        submitting={cancelMutation.isPending}
        onConfirm={() => {
          if (cancelTarget) cancelMutation.mutate(cancelTarget.id);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete tenant"
        description={`Permanently delete ${deleteTarget?.schoolName}? This cannot be undone.`}
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
