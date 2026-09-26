import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { formatCurrency } from "@/utils/format";
import { currentMonthKey, HOSTEL_FEE_STATUS_CONFIG } from "../constants";
import { generateFeePaymentsForMonth, listFeePayments, markFeePaymentPaid } from "../api";
import type { HostelFeePaymentRow } from "../types";

export default function HostelFeesTab() {
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(currentMonthKey());

  const { data: payments = [], isLoading, isError, refetch } = useQuery({ queryKey: ["hostel", "fee-payments"], queryFn: listFeePayments });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["hostel", "fee-payments"] });

  const generateMutation = useMutation({
    mutationFn: () => generateFeePaymentsForMonth(month),
    onSuccess: (count) => {
      invalidate();
      toast.success(count > 0 ? `Generated ${count} fee record${count === 1 ? "" : "s"} for ${month}` : `Every active allocation already has a record for ${month}`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not generate fee records"),
  });

  const markPaidMutation = useMutation({
    mutationFn: markFeePaymentPaid,
    onSuccess: () => {
      invalidate();
      toast.success("Payment marked paid");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update payment"),
  });

  const columns: ColumnDef<HostelFeePaymentRow, unknown>[] = [
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">
            {row.original.student.firstName} {row.original.student.lastName}
          </p>
          <p className="text-xs text-muted-foreground">{row.original.hostel.name}</p>
        </div>
      ),
    },
    {
      accessorKey: "month",
      header: "Month",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.month}</span>,
    },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{formatCurrency(row.original.amount)}</span>,
    },
    {
      id: "paidOn",
      header: "Paid on",
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.paidOn ? new Date(row.original.paidOn).toLocaleDateString() : "—"}</span>,
    },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = HOSTEL_FEE_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "pending" ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => markPaidMutation.mutate(row.original.id)}
            disabled={markPaidMutation.isPending}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark paid
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Track monthly hostel fee payments per allocation.</p>
        <div className="flex items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="hf-month" className="text-xs">
              Month
            </Label>
            <Input id="hf-month" type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
          </div>
          <Button onClick={() => generateMutation.mutate()} disabled={generateMutation.isPending}>
            <RefreshCw className="w-4 h-4" />
            Generate for month
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={payments} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No fee records yet." pageSize={10} />
    </div>
  );
}
