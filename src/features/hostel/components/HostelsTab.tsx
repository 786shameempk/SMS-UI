import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BedDouble, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { HOSTEL_STATUS_CONFIG, HOSTEL_TYPE_OPTIONS } from "../constants";
import { createHostel, deleteHostel, listEligibleWardenStaff, listHostels, updateHostel } from "../api";
import type { HostelFormValues, HostelRow } from "../types";
import HostelFormDialog from "./HostelFormDialog";
import RoomsDialog from "./RoomsDialog";

export default function HostelsTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HostelRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HostelRow | null>(null);
  const [roomsHostel, setRoomsHostel] = useState<HostelRow | null>(null);
  const [roomsOpen, setRoomsOpen] = useState(false);

  const { data: hostels = [], isLoading } = useQuery({ queryKey: ["hostel", "hostels"], queryFn: listHostels });
  const { data: eligibleWardens = [] } = useQuery({
    queryKey: ["hostel", "eligible-wardens", editing?.id],
    queryFn: () => listEligibleWardenStaff(editing?.id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hostel"] });

  const createMutation = useMutation({
    mutationFn: createHostel,
    onSuccess: () => {
      invalidate();
      toast.success("Hostel created");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not create hostel"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: HostelFormValues }) => updateHostel(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Hostel updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update hostel"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHostel,
    onSuccess: () => {
      invalidate();
      toast.success("Hostel deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete hostel"),
  });

  const columns: ColumnDef<HostelRow, unknown>[] = [
    {
      accessorKey: "name",
      header: "Hostel",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            {HOSTEL_TYPE_OPTIONS.find((o) => o.value === row.original.type)?.label ?? row.original.type} ·{" "}
            {row.original.address ?? "No address on file"}
          </p>
        </div>
      ),
    },
    {
      id: "warden",
      header: "Warden",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.warden ? `${row.original.warden.firstName} ${row.original.warden.lastName}` : "Unassigned"}
        </span>
      ),
    },
    {
      id: "occupancy",
      header: "Occupancy",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.occupiedCount} / {row.original.bedCount} beds · {row.original.roomCount} rooms
        </span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = HOSTEL_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const hostel = row.original;
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
                  setRoomsHostel(hostel);
                  setRoomsOpen(true);
                }}
              >
                <BedDouble className="w-3.5 h-3.5" />
                Manage rooms
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setEditing(hostel);
                  setFormOpen(true);
                }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setDeleteTarget(hostel)}>
                <Trash2 className="w-3.5 h-3.5" />
                Delete
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
        <p className="text-sm text-muted-foreground">Manage hostel buildings, their warden, and rooms.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          New hostel
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={hostels} isLoading={isLoading} emptyMessage="No hostels yet." pageSize={8} />

      <HostelFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        hostel={editing}
        eligibleWardens={eligibleWardens}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <RoomsDialog
        open={roomsOpen}
        onOpenChange={(v) => {
          setRoomsOpen(v);
          if (!v) setRoomsHostel(null);
        }}
        hostel={roomsHostel}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete hostel"
        description={`Delete "${deleteTarget?.name}"? All of its rooms will be removed too. This cannot be undone.`}
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
