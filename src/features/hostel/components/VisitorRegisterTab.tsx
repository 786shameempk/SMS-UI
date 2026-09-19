import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { LogOut, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { VISITOR_STATUS_CONFIG } from "../constants";
import { checkInVisitor, checkOutVisitor, listActiveResidents, listHostels, listVisitorLogs } from "../api";
import type { VisitorLogRow } from "../types";
import VisitorCheckInDialog from "./VisitorCheckInDialog";

export default function VisitorRegisterTab() {
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);

  const { data: logs = [], isLoading } = useQuery({ queryKey: ["hostel", "visitor-logs"], queryFn: listVisitorLogs });
  const { data: hostels = [] } = useQuery({ queryKey: ["hostel", "hostels"], queryFn: listHostels });
  const { data: residents = [] } = useQuery({ queryKey: ["hostel", "active-residents"], queryFn: listActiveResidents });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hostel", "visitor-logs"] });

  const checkInMutation = useMutation({
    mutationFn: checkInVisitor,
    onSuccess: () => {
      invalidate();
      toast.success("Visitor checked in");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not check in visitor"),
  });

  const checkOutMutation = useMutation({
    mutationFn: checkOutVisitor,
    onSuccess: () => {
      invalidate();
      toast.success("Visitor checked out");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not check out visitor"),
  });

  const columns: ColumnDef<VisitorLogRow, unknown>[] = [
    {
      id: "visitor",
      header: "Visitor",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.original.visitorName}</p>
          <p className="text-xs text-muted-foreground capitalize">{row.original.relation} · {row.original.phone}</p>
        </div>
      ),
    },
    {
      id: "student",
      header: "Visiting",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">
          {row.original.student.firstName} {row.original.student.lastName} · {row.original.hostel.name}
        </span>
      ),
    },
    {
      id: "purpose",
      header: "Purpose",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.purpose ?? "—"}</span>,
    },
    {
      id: "checkIn",
      header: "Check-in",
      cell: ({ row }) => <span className="text-sm text-slate-600">{new Date(row.original.checkInAt).toLocaleString()}</span>,
    },
    {
      id: "checkOut",
      header: "Check-out",
      cell: ({ row }) => (
        <span className="text-sm text-slate-600">{row.original.checkOutAt ? new Date(row.original.checkOutAt).toLocaleString() : "—"}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = VISITOR_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "checked-in" ? (
          <Button variant="outline" size="sm" onClick={() => checkOutMutation.mutate(row.original.id)} disabled={checkOutMutation.isPending}>
            <LogOut className="w-3.5 h-3.5" />
            Check out
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Log visitors checking in to see hostel residents.</p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          Check in visitor
        </Button>
      </DataTableToolbar>

      <DataTable columns={columns} data={logs} isLoading={isLoading} emptyMessage="No visitors logged yet." pageSize={10} />

      <VisitorCheckInDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        hostels={hostels}
        residents={residents}
        submitting={checkInMutation.isPending}
        onSubmit={async (values) => {
          await checkInMutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
