import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { LogOut, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listStudents } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import { ALLOCATION_STATUS_CONFIG } from "../constants";
import { allocateStudent, deleteAllocation, listAllocations, listHostels, listRooms, vacateAllocation } from "../api";
import type { AllocateStudentFormValues, HostelAllocationRow } from "../types";
import AllocateStudentDialog from "./AllocateStudentDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function AllocationsTab() {
  const { t } = useTranslation("hostel");
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HostelAllocationRow | null>(null);

  const { data: allocations = [], isLoading, isError, refetch } = useQuery({ queryKey: ["hostel", "allocations"], queryFn: listAllocations });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: hostels = [] } = useQuery({ queryKey: ["hostel", "hostels"], queryFn: listHostels });
  const { data: allRooms = [] } = useQuery({ queryKey: ["hostel", "rooms", "all"], queryFn: () => listRooms() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hostel"] });

  const allocateMutation = useMutation({
    mutationFn: allocateStudent,
    onSuccess: () => {
      invalidate();
      toast.success(t("Student allocated"));
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not allocate student")),
  });

  const vacateMutation = useMutation({
    mutationFn: vacateAllocation,
    onSuccess: () => {
      invalidate();
      toast.success(t("Allocation vacated"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not vacate allocation")),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAllocation,
    onSuccess: () => {
      invalidate();
      toast.success(t("Allocation removed"));
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not remove allocation")),
  });

  const columns: ColumnDef<HostelAllocationRow, unknown>[] = [
    {
      id: "student",
      header: t("Student"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">
            {row.original.student.firstName} {row.original.student.lastName}
          </p>
          <p className="text-xs text-muted-foreground">
            {row.original.student.className}-{row.original.student.section} · {row.original.student.admissionNumber}
          </p>
        </div>
      ),
    },
    {
      id: "hostel",
      header: t("Hostel"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.hostel.name}</span>,
    },
    {
      id: "room",
      header: t("Room / Bed"),
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {row.original.room.roomNumber} · Bed {row.original.bedNumber}
        </span>
      ),
    },
    {
      id: "fee",
      header: t("Monthly fee"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.monthlyFee != null ? formatCurrency(row.original.monthlyFee) : "—"}</span>,
    },
    {
      id: "status",
      header: t("Status"),
      cell: ({ row }) => {
        const config = ALLOCATION_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const allocation = row.original;
        return (
          <RowActions>
            {allocation.status === "active" && (
              <DropdownMenuItem onClick={() => vacateMutation.mutate(allocation.id)}>
                <LogOut className="w-3.5 h-3.5" />
                {t("Vacate")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDeleteTarget(allocation)} variant="destructive">
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
        <p className="text-sm text-muted-foreground">{t("Allocate students to a hostel room and bed.")}</p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          {t("Allocate student")}
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={allocations} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No students allocated yet.")} pageSize={10} />

      <AllocateStudentDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        students={students}
        hostels={hostels}
        rooms={allRooms}
        existingAllocations={allocations}
        submitting={allocateMutation.isPending}
        onSubmit={async (values: AllocateStudentFormValues) => {
          await allocateMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={t("Remove allocation")}
        description={t("Remove \"{{name}}\" from \"{{room}}\"? This cannot be undone.", { name: `${deleteTarget?.student.firstName} ${deleteTarget?.student.lastName}`, room: deleteTarget?.room.roomNumber })}
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
