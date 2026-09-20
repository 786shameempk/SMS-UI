import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarPlus, LogIn, MoreHorizontal, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { formatDateTime } from "@/utils/format";
import { PURPOSE_CONFIG, PRE_APPROVAL_STATUS_CONFIG } from "../constants";
import { cancelPreApprovedVisit, checkInFromPreApproval, createPreApprovedVisit, deletePreApprovedVisit, listPreApprovedVisits } from "../api";
import type { PreApprovedVisitRow } from "../types";
import PreApprovedVisitFormDialog from "./PreApprovedVisitFormDialog";

export default function PreApprovedVisitsTab() {
  const queryClient = useQueryClient();
  const { data: visits = [], isLoading } = useQuery({ queryKey: ["visitors", "preapprovals"], queryFn: () => listPreApprovedVisits() });
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PreApprovedVisitRow | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["visitors", "preapprovals"] });
    queryClient.invalidateQueries({ queryKey: ["visitors", "entries"] });
    queryClient.invalidateQueries({ queryKey: ["visitors", "reports"] });
  };

  const createMutation = useMutation({
    mutationFn: createPreApprovedVisit,
    onSuccess: () => {
      invalidate();
      toast.success("Visit scheduled");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not schedule visit"),
  });

  const checkInMutation = useMutation({
    mutationFn: checkInFromPreApproval,
    onSuccess: (entry) => {
      invalidate();
      toast.success(`${entry.visitorName} checked in — badge ${entry.badgeNumber}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not check in visitor"),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPreApprovedVisit,
    onSuccess: () => {
      invalidate();
      toast.success("Visit cancelled");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not cancel visit"),
  });

  const deleteMutation = useMutation({
    mutationFn: deletePreApprovedVisit,
    onSuccess: () => {
      invalidate();
      toast.success("Pre-approval deleted");
      setDeleteTarget(null);
    },
  });

  const columns: ColumnDef<PreApprovedVisitRow, unknown>[] = [
    {
      id: "visitor",
      header: "Visitor",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.original.visitorName}</p>
          <p className="text-xs text-slate-500">{row.original.phone}</p>
        </div>
      ),
    },
    {
      id: "purpose",
      header: "Purpose",
      cell: ({ row }) => <span className="text-sm text-slate-700">{PURPOSE_CONFIG[row.original.purpose].label}</span>,
    },
    {
      id: "host",
      header: "Here to see",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.hostLabel}</span>,
    },
    {
      accessorKey: "scheduledAt",
      header: "Scheduled for",
      cell: ({ row }) => <span className="text-sm text-slate-600">{formatDateTime(row.original.scheduledAt)}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={PRE_APPROVAL_STATUS_CONFIG[row.original.status].variant}>{PRE_APPROVAL_STATUS_CONFIG[row.original.status].label}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const v = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {v.status === "scheduled" && (
                <>
                  <DropdownMenuItem onClick={() => checkInMutation.mutate(v.id)}>
                    <LogIn className="w-3.5 h-3.5" />
                    Check in now
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => cancelMutation.mutate(v.id)}>
                    <XCircle className="w-3.5 h-3.5" />
                    Cancel
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => setDeleteTarget(v)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
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
        <p className="text-sm text-muted-foreground">Appointments scheduled in advance — check them in on arrival.</p>
        <Button onClick={() => setFormOpen(true)}>
          <CalendarPlus className="w-4 h-4" />
          Schedule visit
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={visits} isLoading={isLoading} emptyMessage="No pre-approved visits scheduled." pageSize={10} />

      <PreApprovedVisitFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete pre-approval"
        description={`Delete the scheduled visit for ${deleteTarget?.visitorName}? This cannot be undone.`}
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
