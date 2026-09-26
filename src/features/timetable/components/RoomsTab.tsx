import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { createRoom, deleteRoom, listRooms, updateRoom } from "../api";
import type { Room, RoomFormValues } from "../types";
import RoomFormDialog from "./RoomFormDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function RoomsTab() {
  const queryClient = useQueryClient();
  const { data: rooms = [], isLoading, isError, refetch } = useQuery({ queryKey: ["timetable", "rooms"], queryFn: listRooms });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Room | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["timetable", "rooms"] });

  const createMutation = useMutation({
    mutationFn: createRoom,
    onSuccess: () => {
      invalidate();
      toast.success("Room added");
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: RoomFormValues }) => updateRoom(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Room updated");
      setFormOpen(false);
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      invalidate();
      toast.success("Room deleted");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<Room, unknown>[] = [
    { accessorKey: "name", header: "Room", cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    { accessorKey: "capacity", header: "Capacity", cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.capacity} seats</span> },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const room = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(room);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(room)} variant="destructive">
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
        <div />
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Add room
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={rooms} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No rooms yet." />

      <RoomFormDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        room={editing}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete room"
        description={`This will permanently delete "${deleteTarget?.name}". Slots referencing it will keep showing the room until reassigned.`}
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
