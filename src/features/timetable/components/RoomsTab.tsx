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

import { useTranslation } from "react-i18next";
export default function RoomsTab() {
  const { t } = useTranslation("timetable");
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
      toast.success(t("Room added"));
      setFormOpen(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: RoomFormValues }) => updateRoom(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Room updated"));
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteRoom,
    onSuccess: () => {
      invalidate();
      toast.success(t("Room deleted"));
      setDeleteTarget(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const columns: ColumnDef<Room, unknown>[] = [
    { accessorKey: "name", header: t("Room"), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.name}</span> },
    { accessorKey: "capacity", header: t("Capacity"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{t("{{capacity}} seats", { capacity: row.original.capacity })}</span> },
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
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(room)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              {t("Delete")}
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
          {t("Add room")}
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={rooms} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No rooms yet.")} />

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
        title={t("Delete room")}
        description={t("This will permanently delete \"{{name}}\". Slots referencing it will keep showing the room until reassigned.", { name: deleteTarget?.name })}
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
