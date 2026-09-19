import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { listStudents } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import { listInvoices, listReceipts } from "../api";
import { PAYMENT_MODE_OPTIONS } from "../constants";
import type { Receipt } from "../types";
import ReceiptView from "./ReceiptView";

export default function ReceiptsTab() {
  const [viewing, setViewing] = useState<Receipt | null>(null);

  const { data: receipts = [], isLoading } = useQuery({ queryKey: ["fees", "receipts"], queryFn: listReceipts });
  const { data: invoices = [] } = useQuery({ queryKey: ["fees", "invoices"], queryFn: listInvoices });
  const { data: students = [] } = useQuery({ queryKey: ["students", "all"], queryFn: listStudents });

  const invoiceById = useMemo(() => new Map(invoices.map((inv) => [inv.id, inv] as const)), [invoices]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);

  const columns: ColumnDef<Receipt, unknown>[] = [
    { accessorKey: "receiptNumber", header: "Receipt No.", cell: ({ row }) => <span className="text-sm font-medium text-slate-800">{row.original.receiptNumber}</span> },
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => {
        const invoice = invoiceById.get(row.original.invoiceId);
        const student = invoice ? studentById.get(invoice.studentId) : undefined;
        return <span className="text-sm text-slate-700">{student ? `${student.firstName} ${student.lastName}` : "—"}</span>;
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => <span className="text-sm text-slate-700 tabular-nums">{formatCurrency(row.original.amount)}</span>,
    },
    {
      accessorKey: "paymentMode",
      header: "Mode",
      cell: ({ row }) => <Badge variant="neutral">{PAYMENT_MODE_OPTIONS.find((o) => o.value === row.original.paymentMode)?.label}</Badge>,
    },
    {
      accessorKey: "paidOn",
      header: "Paid on",
      cell: ({ row }) => <span className="text-sm text-slate-600">{new Date(row.original.paidOn).toLocaleDateString()}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button variant="ghost" size="sm" onClick={() => setViewing(row.original)}>
          <Eye className="w-3.5 h-3.5" />
          View
        </Button>
      ),
    },
  ];

  const sorted = [...receipts].sort((a, b) => new Date(b.paidOn).getTime() - new Date(a.paidOn).getTime());
  const viewingInvoice = viewing ? invoiceById.get(viewing.invoiceId) : undefined;
  const viewingStudent = viewingInvoice ? studentById.get(viewingInvoice.studentId) : undefined;

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">Receipts are generated automatically whenever a payment is recorded.</p>
      </DataTableToolbar>

      <DataTable columns={columns} data={sorted} isLoading={isLoading} emptyMessage="No receipts generated yet." />

      <ReceiptView open={Boolean(viewing)} onOpenChange={(v) => !v && setViewing(null)} receipt={viewing} invoice={viewingInvoice} student={viewingStudent} />
    </div>
  );
}
