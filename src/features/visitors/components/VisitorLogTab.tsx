import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, LogOut, MoreHorizontal, Trash2, UserPlus } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/utils/format";
import { PURPOSE_CONFIG, VISITOR_STATUS_CONFIG } from "../constants";
import { checkInVisitor, checkOutVisitor, deleteVisitorEntry, listVisitorEntries } from "../api";
import type { VisitorEntryRow } from "../types";
import CheckInDialog from "./CheckInDialog";

export default function VisitorLogTab() {
  const queryClient = useQueryClient();
  const { data: entries = [], isLoading } = useQuery({ queryKey: ["visitors", "entries"], queryFn: () => listVisitorEntries() });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<VisitorEntryRow | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["visitors", "entries"] });
    queryClient.invalidateQueries({ queryKey: ["visitors", "reports"] });
    queryClient.invalidateQueries({ queryKey: ["visitors", "preapprovals"] });
  };

  const checkInMutation = useMutation({
    mutationFn: checkInVisitor,
    onSuccess: (entry) => {
      invalidate();
      toast.success(`${entry.visitorName} checked in — badge ${entry.badgeNumber}`);
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not check in visitor"),
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOutVisitor,
    onSuccess: (entry) => {
      invalidate();
      toast.success(`${entry.visitorName} checked out`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not check out visitor"),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteVisitorEntry,
    onSuccess: () => {
      invalidate();
      toast.success("Visitor entry deleted");
      setDeleteTarget(null);
    },
  });

  const filtered = useMemo(() => (statusFilter === "all" ? entries : entries.filter((e) => e.status === statusFilter)), [entries, statusFilter]);
  const currentlyOnPremises = useMemo(() => entries.filter((e) => e.status === "checked-in").length, [entries]);

  const columns: ColumnDef<VisitorEntryRow, unknown>[] = [
    {
      id: "visitor",
      header: "Visitor",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
            {row.original.visitorName}
            {row.original.onWatchlist && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
          </p>
          <p className="text-xs text-slate-500">
            {row.original.badgeNumber} &middot; {row.original.phone}
          </p>
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
      accessorKey: "checkInAt",
      header: "Check-in",
      cell: ({ row }) => <span className="text-sm text-slate-600">{formatDateTime(row.original.checkInAt)}</span>,
    },
    {
      id: "checkOutAt",
      header: "Check-out",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.checkOutAt ? formatDateTime(row.original.checkOutAt) : "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={VISITOR_STATUS_CONFIG[row.original.status].variant}>{VISITOR_STATUS_CONFIG[row.original.status].label}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const e = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {e.status === "checked-in" && (
                <DropdownMenuItem onClick={() => checkOutMutation.mutate(e.id)}>
                  <LogOut className="w-3.5 h-3.5" />
                  Check out
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setDeleteTarget(e)} className="text-red-600 focus:bg-red-50 focus:text-red-700">
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Currently on premises</p>
            <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading ? "—" : currentlyOnPremises}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground">Total logged visits</p>
            <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{isLoading ? "—" : entries.length}</p>
          </CardContent>
        </Card>
      </div>

      <DataTableToolbar>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="checked-in">Checked in</SelectItem>
            <SelectItem value="checked-out">Checked out</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={() => setFormOpen(true)}>
          <UserPlus className="w-4 h-4" />
          Check in visitor
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No visitor entries match your filter." pageSize={10} />

      <CheckInDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={checkInMutation.isPending}
        onSubmit={async (values) => {
          await checkInMutation.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title="Delete visitor entry"
        description={`Delete the log entry for ${deleteTarget?.visitorName}? This cannot be undone.`}
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
