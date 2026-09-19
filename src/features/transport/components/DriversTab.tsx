import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { DRIVER_STATUS_CONFIG } from "../constants";
import { createDriver, deleteDriver, listDrivers, listEligibleDriverStaff, updateDriver } from "../api";
import type { Driver, DriverFormValues } from "../types";
import DriverFormDialog from "./DriverFormDialog";

export default function DriversTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Driver | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Driver | null>(null);

  const { data: drivers = [], isLoading } = useQuery({ queryKey: ["transport", "drivers"], queryFn: listDrivers });
  const { data: eligibleStaff = [] } = useQuery({ queryKey: ["transport", "eligible-driver-staff"], queryFn: listEligibleDriverStaff });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["transport"] });

  const createMutation = useMutation({
    mutationFn: createDriver,
    onSuccess: () => {
      invalidate();
      toast.success("Driver profile added");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add driver"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: DriverFormValues }) => updateDriver(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Driver profile updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update driver"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDriver,
    onSuccess: () => {
      invalidate();
      toast.success("Driver profile removed");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove driver"),
  });

  const columns: ColumnDef<Driver, unknown>[] = [
    {
      id: "name",
      header: "Driver",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">
            {row.original.staff.firstName} {row.original.staff.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{row.original.staff.employeeId} · {row.original.staff.phone}</p>
        </div>
      ),
    },
    {
      id: "license",
      header: "License",
      cell: ({ row }) => (
        <div>
          <p className="text-sm text-slate-600">{row.original.licenseNumber}</p>
          <p className="text-xs text-muted-foreground">Expires {new Date(row.original.licenseExpiryDate).toLocaleDateString()}</p>
        </div>
      ),
    },
    {
      id: "experience",
      header: "Experience",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.experienceYears} yrs</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = DRIVER_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const driver = row.original;
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
                  setEditing(driver);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(driver)}>
                <Trash2 className="w-3.5 h-3.5" />
                Remove
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
        <p className="text-sm text-muted-foreground">Drivers are staff members with license and experience details on top.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New driver
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={drivers} isLoading={isLoading} emptyMessage="No driver profiles yet." pageSize={8} />

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
        title="Remove driver profile"
        description={`Remove the driver profile for "${deleteTarget?.staff.firstName} ${deleteTarget?.staff.lastName}"? This cannot be undone.`}
        confirmLabel="Remove"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
      />
    </div>
  );
}
