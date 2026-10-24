import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { BedDouble, Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { HOSTEL_STATUS_CONFIG, HOSTEL_TYPE_OPTIONS } from "../constants";
import { createHostel, deleteHostel, listEligibleWardenStaff, listHostels, updateHostel } from "../api";
import type { HostelFormValues, HostelRow } from "../types";
import HostelFormDialog from "./HostelFormDialog";
import RoomsDialog from "./RoomsDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function HostelsTab() {
  const { t } = useTranslation("hostel");
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<HostelRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HostelRow | null>(null);
  const [roomsHostel, setRoomsHostel] = useState<HostelRow | null>(null);
  const [roomsOpen, setRoomsOpen] = useState(false);

  const { data: hostels = [], isLoading, isError, refetch } = useQuery({ queryKey: ["hostel", "hostels"], queryFn: listHostels });
  const { data: eligibleWardens = [] } = useQuery({
    queryKey: ["hostel", "eligible-wardens", editing?.id],
    queryFn: () => listEligibleWardenStaff(editing?.id),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hostel"] });

  const createMutation = useMutation({
    mutationFn: createHostel,
    onSuccess: () => {
      invalidate();
      toast.success(t("Hostel created"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not create hostel")),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: HostelFormValues }) => updateHostel(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Hostel updated"));
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not update hostel")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteHostel,
    onSuccess: () => {
      invalidate();
      toast.success(t("Hostel deleted"));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not delete hostel")),
  });

  const columns: ColumnDef<HostelRow, unknown>[] = [
    {
      accessorKey: "name",
      header: t("Hostel"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">
            {t(HOSTEL_TYPE_OPTIONS.find((o) => o.value === row.original.type)?.label ?? row.original.type)} ·{" "}
            {row.original.address ?? t("No address on file")}
          </p>
        </div>
      ),
    },
    {
      id: "warden",
      header: t("Warden"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {row.original.warden ? `${row.original.warden.firstName} ${row.original.warden.lastName}` : t("Unassigned")}
        </span>
      ),
    },
    {
      id: "occupancy",
      header: t("Occupancy"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {row.original.occupiedCount} / {row.original.bedCount} beds · {row.original.roomCount} rooms
        </span>
      ),
    },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }) => {
        const config = HOSTEL_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const hostel = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setRoomsHostel(hostel);
                setRoomsOpen(true);
              }}
            >
              <BedDouble className="w-3.5 h-3.5" />
              {t("Manage rooms")}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setEditing(hostel);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              {t("Edit")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteTarget(hostel)} variant="destructive">
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
        <p className="text-sm text-muted-foreground">{t("Manage hostel buildings, their warden, and rooms.")}</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          {t("New hostel")}
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={hostels} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No hostels yet.")} pageSize={8} />

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
        title={t("Delete hostel")}
        description={t("Delete \"{{name}}\"? All of its rooms will be removed too. This cannot be undone.", { name: deleteTarget?.name })}
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
