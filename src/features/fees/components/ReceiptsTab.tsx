import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { listStudents } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import { useAuthStore } from "@/store/authStore";
import { deleteReceipt, listInvoices, listReceipts } from "../api";
import { PAYMENT_MODE_OPTIONS } from "../constants";
import type { Receipt } from "../types";
import ReceiptView from "./ReceiptView";
import DeleteReceiptDialog from "./DeleteReceiptDialog";

export default function ReceiptsTab() {
  const { t } = useTranslation("fees");
  const queryClient = useQueryClient();
  const [viewing, setViewing] = useState<Receipt | null>(null);
  const [deleting, setDeleting] = useState<Receipt | null>(null);
  // Deleting a payment is for administrators only (the server enforces it too).
  const role = useAuthStore((s) => s.user?.role);
  const canDelete = role === "admin" || role === "principal" || role === "superAdmin";

  const deleteMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => deleteReceipt(id, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast.success(t("Payment deleted"));
      setDeleting(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not delete the payment")),
  });

  const { data: receipts = [], isLoading, isError, refetch } = useQuery({ queryKey: ["fees", "receipts"], queryFn: listReceipts });
  const { data: invoices = [] } = useQuery({ queryKey: ["fees", "invoices"], queryFn: listInvoices });
  const { data: students = [] } = useQuery({ queryKey: ["students", "all"], queryFn: listStudents });

  const invoiceById = useMemo(() => new Map(invoices.map((inv) => [inv.id, inv] as const)), [invoices]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);

  const modeLabel = (mode: Receipt["paymentMode"]) => {
    const label = PAYMENT_MODE_OPTIONS.find((o) => o.value === mode)?.label;
    return label ? t(label) : label;
  };

  const columns: ColumnDef<Receipt, unknown>[] = [
    { accessorKey: "receiptNumber", header: t("Receipt No."), cell: ({ row }) => <span className="text-sm font-medium text-foreground">{row.original.receiptNumber}</span> },
    {
      id: "student",
      header: t("Student"),
      cell: ({ row }) => {
        const invoice = invoiceById.get(row.original.invoiceId);
        const student = invoice ? studentById.get(invoice.studentId) : undefined;
        return <span className="text-sm text-foreground">{student ? `${student.firstName} ${student.lastName}` : "—"}</span>;
      },
    },
    {
      accessorKey: "amount",
      header: t("Amount"),
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">{formatCurrency(row.original.amount)}</span>,
    },
    {
      accessorKey: "paymentMode",
      header: t("Mode"),
      cell: ({ row }) => <Badge variant="neutral">{modeLabel(row.original.paymentMode)}</Badge>,
    },
    {
      accessorKey: "paidOn",
      header: t("Paid on"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{new Date(row.original.paidOn).toLocaleDateString()}</span>,
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => setViewing(row.original)}>
            <Eye className="w-3.5 h-3.5" />
            {t("View")}
          </Button>
          {canDelete && !row.original.providerPaymentId && (
            <Button variant="ghost" size="sm" className="text-destructive-strong" onClick={() => setDeleting(row.original)}>
              <Trash2 className="w-3.5 h-3.5" />
              {t("Delete")}
            </Button>
          )}
        </div>
      ),
    },
  ];

  const sorted = [...receipts].sort((a, b) => new Date(b.paidOn).getTime() - new Date(a.paidOn).getTime());
  const viewingInvoice = viewing ? invoiceById.get(viewing.invoiceId) : undefined;
  const viewingStudent = viewingInvoice ? studentById.get(viewingInvoice.studentId) : undefined;

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Receipts are generated automatically whenever a payment is recorded.")}</p>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={sorted} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No receipts generated yet.")} />

      <DeleteReceiptDialog
        receipt={deleting}
        onOpenChange={(v) => !v && setDeleting(null)}
        submitting={deleteMutation.isPending}
        onConfirm={(reason) => {
          if (deleting) deleteMutation.mutate({ id: deleting.id, reason });
        }}
      />

      <ReceiptView open={Boolean(viewing)} onOpenChange={(v) => !v && setViewing(null)} receipt={viewing} invoice={viewingInvoice} student={viewingStudent} />
    </div>
  );
}
