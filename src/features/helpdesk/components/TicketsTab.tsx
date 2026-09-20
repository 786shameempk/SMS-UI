import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { AlertTriangle, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { formatRelativeDay } from "@/utils/format";
import { CATEGORY_CONFIG, CATEGORY_OPTIONS, PRIORITY_CONFIG, PRIORITY_OPTIONS, STATUS_CONFIG } from "../constants";
import { listTickets } from "../api";
import type { TicketRow } from "../types";
import TicketDetailDialog from "./TicketDetailDialog";

export default function TicketsTab() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["helpdesk", "tickets", statusFilter, categoryFilter, priorityFilter],
    queryFn: () =>
      listTickets({
        status: statusFilter === "all" ? undefined : (statusFilter as TicketRow["status"]),
        category: categoryFilter === "all" ? undefined : (categoryFilter as TicketRow["category"]),
        priority: priorityFilter === "all" ? undefined : (priorityFilter as TicketRow["priority"]),
      }),
  });

  const columns: ColumnDef<TicketRow, unknown>[] = [
    {
      id: "ticket",
      header: "Ticket",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
            {row.original.ticketNumber}
            {row.original.isOverdue && <AlertTriangle className="w-3.5 h-3.5 text-red-600" />}
          </p>
          <p className="text-xs text-slate-500 truncate max-w-xs">{row.original.subject}</p>
        </div>
      ),
    },
    {
      id: "category",
      header: "Category",
      cell: ({ row }) => <span className="text-sm text-slate-700">{CATEGORY_CONFIG[row.original.category].label}</span>,
    },
    {
      id: "priority",
      header: "Priority",
      cell: ({ row }) => <Badge variant={PRIORITY_CONFIG[row.original.priority].variant}>{PRIORITY_CONFIG[row.original.priority].label}</Badge>,
    },
    {
      id: "raisedBy",
      header: "Raised by",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.raisedByLabel}</span>,
    },
    {
      id: "assignedTo",
      header: "Assigned to",
      cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.assignedTo ? `${row.original.assignedTo.firstName} ${row.original.assignedTo.lastName}` : "Unassigned"}</span>,
    },
    {
      accessorKey: "createdAt",
      header: "Raised",
      cell: ({ row }) => <span className="text-sm text-slate-600">{formatRelativeDay(row.original.createdAt)}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => <Badge variant={STATUS_CONFIG[row.original.status].variant}>{STATUS_CONFIG[row.original.status].label}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setSelectedId(row.original.id)}>
          <Eye className="w-3.5 h-3.5" />
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_CONFIG) as Array<keyof typeof STATUS_CONFIG>).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_CONFIG[s].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All priorities</SelectItem>
              {PRIORITY_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </DataTableToolbar>

      <DataTable
        columns={columns}
        data={tickets}
        isLoading={isLoading}
        emptyMessage="No tickets match your filters."
        pageSize={10}
      />

      <TicketDetailDialog ticketId={selectedId} open={Boolean(selectedId)} onOpenChange={(v) => !v && setSelectedId(null)} />
    </div>
  );
}
