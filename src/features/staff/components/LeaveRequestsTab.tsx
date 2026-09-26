import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Plus, X } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { createLeaveRequest, listLeaveRequests, listStaff, setLeaveStatus } from "../api";
import { LEAVE_TYPES } from "../constants";
import type { LeaveRequestFormValues, LeaveStatus, StaffLeaveRequest } from "../types";
import LeaveRequestFormDialog from "./LeaveRequestFormDialog";

const STATUS_CONFIG: Record<LeaveStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  pending: { label: "Pending", variant: "warning" },
  approved: { label: "Approved", variant: "success" },
  rejected: { label: "Rejected", variant: "danger" },
};

export default function LeaveRequestsTab() {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading, isError, refetch } = useQuery({ queryKey: ["staff", "leave"], queryFn: listLeaveRequests });
  const { data: staffList = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });
  const [formOpen, setFormOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["staff", "leave"] });

  const createMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      invalidate();
      toast.success("Leave request created");
      setFormOpen(false);
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: LeaveStatus }) => setLeaveStatus(id, status),
    onSuccess: (req) => {
      invalidate();
      const name = staffOf(req.staffId);
      toast.success(`${name} — leave ${req.status}`);
    },
  });

  const staffOf = (staffId: string) => {
    const s = staffList.find((s) => s.id === staffId);
    return s ? `${s.firstName} ${s.lastName}` : staffId;
  };

  const columns: ColumnDef<StaffLeaveRequest, unknown>[] = [
    {
      id: "staff",
      header: "Staff member",
      cell: ({ row }) => <span className="text-sm font-medium text-foreground">{staffOf(row.original.staffId)}</span>,
    },
    {
      accessorKey: "leaveType",
      header: "Type",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">{LEAVE_TYPES.find((t) => t.value === row.original.leaveType)?.label}</span>
      ),
    },
    {
      id: "dates",
      header: "Dates",
      cell: ({ row }) => (
        <span className="text-sm text-secondary-foreground">
          {new Date(row.original.fromDate).toLocaleDateString()} - {new Date(row.original.toDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      accessorKey: "reason",
      header: "Reason",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground truncate block max-w-[220px]">{row.original.reason}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const req = row.original;
        if (req.status !== "pending") return null;
        return (
          <div className="flex items-center gap-1.5 justify-end">
            <Button
              size="sm"
              variant="outline"
              className="text-success-strong border-success/30 hover:bg-success-soft"
              onClick={() => statusMutation.mutate({ id: req.id, status: "approved" })}
            >
              <Check className="w-3.5 h-3.5" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-destructive-strong border-destructive/30 hover:bg-destructive-soft"
              onClick={() => statusMutation.mutate({ id: req.id, status: "rejected" })}
            >
              <X className="w-3.5 h-3.5" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Review and record leave across all staff.</p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          New leave request
        </Button>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={requests} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No leave requests." />

      <LeaveRequestFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        staffList={staffList}
        submitting={createMutation.isPending}
        onSubmit={async (values: LeaveRequestFormValues) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
