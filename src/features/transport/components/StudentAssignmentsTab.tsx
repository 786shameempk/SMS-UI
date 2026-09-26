import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Plus, Trash2, UserRoundCheck, UserRoundX } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { listStudents } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import { ASSIGNMENT_STATUS_CONFIG } from "../constants";
import { createAssignment, deleteAssignment, listAssignments, listRoutes, listStops, setAssignmentStatus, updateAssignment } from "../api";
import type { StudentTransportAssignmentFormValues, StudentTransportAssignmentRow } from "../types";
import AssignStudentDialog from "./AssignStudentDialog";
import { RowActions } from "@/components/ui/row-actions";

export default function StudentAssignmentsTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<StudentTransportAssignmentRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StudentTransportAssignmentRow | null>(null);

  const { data: assignments = [], isLoading, isError, refetch } = useQuery({ queryKey: ["transport", "assignments"], queryFn: listAssignments });
  const { data: students = [] } = useQuery({ queryKey: ["students"], queryFn: listStudents });
  const { data: routes = [] } = useQuery({ queryKey: ["transport", "routes"], queryFn: listRoutes });
  const { data: allStops = [] } = useQuery({ queryKey: ["transport", "stops", "all"], queryFn: () => listStops() });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["transport"] });

  const createMutation = useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      invalidate();
      toast.success("Student assigned to transport");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not assign student"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: StudentTransportAssignmentFormValues }) => updateAssignment(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Assignment updated");
      setFormOpen(false);
      setEditing(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update assignment"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: "active" | "inactive" }) => setAssignmentStatus(id, status),
    onSuccess: () => {
      invalidate();
      toast.success("Status updated");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update status"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      invalidate();
      toast.success("Assignment removed");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not remove assignment"),
  });

  const columns: ColumnDef<StudentTransportAssignmentRow, unknown>[] = [
    {
      id: "student",
      header: "Student",
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
      id: "route",
      header: "Route",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.route.name}</span>,
    },
    {
      id: "stop",
      header: "Stop",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {row.original.stop.name} ({row.original.stop.arrivalTime})
        </span>
      ),
    },
    {
      id: "fee",
      header: "Monthly fee",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.monthlyFee != null ? formatCurrency(row.original.monthlyFee) : "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = ASSIGNMENT_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const assignment = row.original;
        return (
          <RowActions>
            <DropdownMenuItem
              onClick={() => {
                setEditing(assignment);
                setFormOpen(true);
              }}
            >
              <Pencil className="w-3.5 h-3.5" />
              Edit
            </DropdownMenuItem>
            {assignment.status === "active" ? (
              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: assignment.id, status: "inactive" })}>
                <UserRoundX className="w-3.5 h-3.5" />
                Mark inactive
              </DropdownMenuItem>
            ) : (
              <DropdownMenuItem onClick={() => statusMutation.mutate({ id: assignment.id, status: "active" })}>
                <UserRoundCheck className="w-3.5 h-3.5" />
                Mark active
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDeleteTarget(assignment)} variant="destructive">
              <Trash2 className="w-3.5 h-3.5" />
              Remove
            </DropdownMenuItem>
          </RowActions>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Assign students to a transport route and pickup stop.</p>
        <Button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          <Plus className="w-4 h-4" />
          Assign student
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={assignments} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No students assigned to transport yet." pageSize={10} />

      <AssignStudentDialog
        open={formOpen}
        onOpenChange={(v) => {
          setFormOpen(v);
          if (!v) setEditing(null);
        }}
        assignment={editing}
        students={students}
        routes={routes}
        stops={allStops}
        existingAssignments={assignments}
        submitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editing) await updateMutation.mutateAsync({ id: editing.id, values });
          else await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Remove transport assignment"
        description={`Remove "${deleteTarget?.student.firstName} ${deleteTarget?.student.lastName}" from "${deleteTarget?.route.name}"? This cannot be undone.`}
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
