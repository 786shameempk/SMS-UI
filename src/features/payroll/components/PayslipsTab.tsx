import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Wallet } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { formatCurrency } from "@/utils/format";
import { monthLabel } from "../constants";
import { listPayrollRuns, listPayslips, markPayslipPaid } from "../api";
import type { PayslipRow } from "../types";
import PayslipView from "./PayslipView";

export default function PayslipsTab() {
  const queryClient = useQueryClient();
  const { data: runs = [] } = useQuery({ queryKey: ["payroll", "runs"], queryFn: listPayrollRuns });
  const { data: payslips = [], isLoading } = useQuery({ queryKey: ["payroll", "payslips"], queryFn: () => listPayslips() });

  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewing, setViewing] = useState<PayslipRow | null>(null);

  const payMutation = useMutation({
    mutationFn: markPayslipPaid,
    onSuccess: (_slip, id) => {
      queryClient.invalidateQueries({ queryKey: ["payroll"] });
      queryClient.invalidateQueries({ queryKey: ["staff"] });
      const row = payslips.find((p) => p.id === id);
      toast.success(row ? `Paid ${row.staff.firstName} ${row.staff.lastName} for ${monthLabel(row.month)}` : "Payslip paid");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not mark as paid"),
  });

  const filtered = useMemo(() => {
    return payslips.filter((p) => {
      const matchesMonth = monthFilter === "all" || p.month === monthFilter;
      const matchesStatus = statusFilter === "all" || (statusFilter === "paid" ? p.paid : !p.paid);
      return matchesMonth && matchesStatus;
    });
  }, [payslips, monthFilter, statusFilter]);

  const months = useMemo(() => Array.from(new Set(runs.map((r) => r.month))).sort((a, b) => b.localeCompare(a)), [runs]);

  const columns: ColumnDef<PayslipRow, unknown>[] = [
    {
      id: "staff",
      header: "Staff",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">
            {row.original.staff.firstName} {row.original.staff.lastName}
          </p>
          <p className="text-xs text-slate-500">
            {row.original.staff.employeeId} &middot; {row.original.staff.designation}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "month",
      header: "Month",
      cell: ({ row }) => <span className="text-sm text-slate-700">{monthLabel(row.original.month)}</span>,
    },
    {
      accessorKey: "netPay",
      header: "Net pay",
      cell: ({ row }) => <span className="text-sm text-slate-700 tabular-nums">{formatCurrency(row.original.netPay)}</span>,
    },
    {
      accessorKey: "paid",
      header: "Status",
      cell: ({ row }) => <Badge variant={row.original.paid ? "success" : "warning"}>{row.original.paid ? "Paid" : "Pending"}</Badge>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const slip = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewing(slip)}>
              <Eye className="w-3.5 h-3.5" />
            </Button>
            {!slip.paid && (
              <Button size="sm" variant="outline" onClick={() => payMutation.mutate(slip.id)} disabled={payMutation.isPending}>
                <Wallet className="w-3.5 h-3.5" />
                Mark paid
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <div className="flex items-center gap-2">
          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All months</SelectItem>
              {months.map((m) => (
                <SelectItem key={m} value={m}>
                  {monthLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No payslips match your filters." pageSize={10} />

      <PayslipView open={Boolean(viewing)} onOpenChange={(v) => !v && setViewing(null)} payslip={viewing} />
    </div>
  );
}
