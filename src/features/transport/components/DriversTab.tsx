import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { DRIVER_STATUS_CONFIG } from "../constants";
import { createDriver, deleteDriver, listDrivers, listEligibleDriverStaff, updateDriver } from "../api";
import type { Driver, DriverFormValues } from "../types";
import DriverFormDialog from "./DriverFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function DriversTab() {
  const { t } = useTranslation("transport");
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const { data: drivers = [], isLoading, isError, refetch } = useQuery({ queryKey: ["transport", "drivers"], queryFn: listDrivers });
  const { data: eligibleStaff = [] } = useQuery({ queryKey: ["transport", "eligible-driver-staff"], queryFn: listEligibleDriverStaff });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["transport"] });

  const createMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      invalidate();
      toast.success(t("Driver profile added"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not add driver")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: DriverFormValues }) => updateDriver(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Driver profile updated"));
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update driver")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => {
      invalidate();
      toast.success(t("Driver profile removed"));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not remove driver")),
  });

  const columns: ColumnDef<Driver, unknown>[] = [
    {
      id: "name",
      header: t("Driver"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">
            {row.original.staff.firstName} {row.original.staff.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{row.original.staff.employeeId} · {row.original.staff.phone}</p>
        </div>
      ),
    },
    {
      id: "license",
      header: t("License"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-secondary-foreground">{row.original.licenseNumber}</p>
          <p className="text-xs text-muted-foreground">{t("Expires {{date}}", { date: new Date(row.original.licenseExpiryDate).toLocaleDateString() })}</p>
        </div>
      ),
    },
    {
      id: "experience",
      header: t("Experience"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{t("{{years}} yrs", { years: row.original.experienceYears })}</span>,
    },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }) => {
        const config = DRIVER_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const driver = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(driver);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(driver)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {t("Remove")}
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Drivers are staff members with license and experience details on top.")}</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          {t("New driver")}
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={drivers} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No driver profiles yet.")} pageSize={8} />

      <DriverFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        driver={editing}
        eligibleStaff={eligibleStaff}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Remove driver profile")}
        description={t('Remove the driver profile for "{{name}}"? This cannot be undone.', { name: `${deleteTarget?.staff.firstName} ${deleteTarget?.staff.lastName}` })}
        confirmLabel={t("Remove")}
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
