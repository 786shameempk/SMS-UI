import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { LogOut, MoreHorizontal, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listStudents } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import { ALLOCATION_STATUS_CONFIG } from "../constants";
import { allocateStudent, deleteAllocation, listAllocations, listHostels, listRooms, vacateAllocation } from "../api";
import type { AllocateStudentFormValues, HostelAllocationRow } from "../types";
import AllocateStudentDialog from "./AllocateStudentDialog";

export default function AllocationsTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<HostelAllocationRow | null>(null);

  const { data: allocations = [], isLoading } = useQuery({ queryKey: ["hostel", "allocations"], queryFn: listAllocations });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: hostels = [] } = useQuery({ queryKey: ["hostel", "hostels"], queryFn: listHostels });
  const { data: allRooms = [] } = useQuery({ queryKey: ["hostel", "rooms", "all"], queryFn: () => listRooms() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hostel"] });

  const allocateMutation = useMutation({
    mutationFn: allocateStudent,
    onSuccess: () => {
      invalidate();
      toast.success("Student allocated");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not allocate student"),
  });

  const vacateMutation = useMutation({
    mutationFn: vacateAllocation,
    onSuccess: () => {
      invalidate();
      toast.success("Allocation vacated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not vacate allocation"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAllocation,
    onSuccess: () => {
      invalidate();
      toast.success("Allocation removed");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove allocation"),
  });

  const columns: ColumnDef<HostelAllocationRow, unknown>[] = [
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">
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
      header: "Hostel",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.hostel.name}</span>,
    },
    {
      id: "room",
      header: "Room / Bed",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.room.roomNumber} · Bed {row.original.bedNumber}
        </span>
      ),
    },
    {
      id: "fee",
      header: "Monthly fee",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.monthlyFee != null ? formatCurrency(row.original.monthlyFee) : "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = ALLOCATION_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const allocation = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {allocation.status === "active" && (
                <DropdownMenuItem onClick={() => vacateMutation.mutate(allocation.id)}>
                  <LogOut className="w-3.5 h-3.5" />
                  Vacate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setDeleteTarget(allocation)}>
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
        <p className="text-sm text-muted-foreground">Allocate students to a hostel room and bed.</p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Allocate student
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={allocations} isLoading={isLoading} emptyMessage="No students allocated yet." pageSize={10} />

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
        title="Remove allocation"
        description={`Remove "${deleteTarget?.student.firstName} ${deleteTarget?.student.lastName}" from "${deleteTarget?.room.roomNumber}"? This cannot be undone.`}
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
