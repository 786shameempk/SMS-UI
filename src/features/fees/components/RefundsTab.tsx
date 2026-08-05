import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { listStudents } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import { listInvoices, listRefunds, processRefund } from "../api";
import { REFUND_STATUS_CONFIG } from "../constants";
import type { Refund } from "../types";

export default function RefundsTab() {
  const queryClient = useQueryClient();

  const { data: refunds = [], isLoading } = useQuery({ queryKey: ["fees", "refunds"], queryFn: listRefunds });
  const { data: invoices = [] } = useQuery({ queryKey: ["fees", "invoices"], queryFn: listInvoices });
  const { data: students = [] } = useQuery({ queryKey: ["students", "all"], queryFn: listStudents });

  const invoiceById = useMemo(() => new Map(invoices.map((inv) => [inv.id, inv] as const)), [invoices]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);

  const processMutation = useMutation({
    mutationFn: processRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast.success("Refund marked as processed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not process refund"),
  });

  const columns: ColumnDef<Refund, unknown>[] = [
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => {
        const invoice = invoiceById.get(row.original.invoiceId);
        const student = invoice ? studentById.get(invoice.studentId) : undefined;
        return (
          <div>
            <p className="text-sm font-medium text-slate-800">{student ? `${student.firstName} ${student.lastName}` : "—"}</p>
            <p className="text-xs text-slate-500">{invoice ? `${invoice.term} · ${invoice.feeType}` : ""}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => <span className="text-sm text-slate-700 tabular-nums">{formatCurrency(row.original.amount)}</span>,
    },
    { accessorKey: "reason", header: "Reason", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.reason}</span> },
    {
      accessorKey: "refundedOn",
      header: "Date",
      cell: ({ row }) => <span className="text-sm text-slate-600">{new Date(row.original.refundedOn).toLocaleDateString()}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = REFUND_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.status === "pending" ? (
          <Button variant="ghost" size="sm" onClick={() => processMutation.mutate(row.original.id)} disabled={processMutation.isPending}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Mark processed
          </Button>
        ) : null,
    },
  ];

  const sorted = [...refunds].sort((a, b) => new Date(b.refundedOn).getTime() - new Date(a.refundedOn).getTime());

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Refund requests raised from student invoices.</p>
      </DataTableToolbar>
      <DataTable columns={columns} data={sorted} isLoading={isLoading} emptyMessage="No refunds recorded yet." />
    </div>
  );
}
