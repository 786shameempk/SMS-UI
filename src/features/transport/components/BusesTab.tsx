import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { BUS_STATUS_CONFIG } from "../constants";
import { createBus, deleteBus, listBuses, updateBus } from "../api";
import type { Bus, BusFormValues } from "../types";
import BusFormDialog from "./BusFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function BusesTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Bus | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Bus | null>(null);

  const { data: buses = [], isLoading, isError, refetch } = useQuery({ queryKey: ["transport", "buses"], queryFn: listBuses });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["transport"] });

  const createMutation = useMutation({
    mutationFn: createBus,
    onSuccess: () => {
      invalidate();
      toast.success("Bus added");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add bus"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: BusFormValues }) => updateBus(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Bus updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update bus"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBus,
    onSuccess: () => {
      invalidate();
      toast.success("Bus deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete bus"),
  });

  const columns: ColumnDef<Bus, unknown>[] = [
    {
      accessorKey: "regNumber",
      header: "Registration",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.regNumber}</p>
          <p className="text-xs text-muted-foreground">{row.original.model}</p>
        </div>
      ),
    },
    {
      id: "capacity",
      header: "Capacity",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.capacity} seats</span>,
    },
    {
      id: "year",
      header: "Manufacture year",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.manufactureYear}</span>,
    },
    {
      id: "gps",
      header: "GPS device",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.gpsDeviceId ?? "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = BUS_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const bus = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(bus);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(bus)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Manage the fleet of vehicles used to run transport routes.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New bus
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={buses} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No buses in the fleet yet." pageSize={8} />

      <BusFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        bus={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete bus"
        description={`Delete "${deleteTarget?.regNumber}"? This cannot be undone.`}
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
