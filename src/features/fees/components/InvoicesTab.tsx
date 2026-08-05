import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, ListPlus, MoreHorizontal, Percent, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listStudents } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import {
  applyDiscountToInvoice,
  generateInstallments,
  listDiscounts,
  listFeeStructures,
  listInvoices,
  recordPayment,
  requestRefund,
} from "../api";
import { FEE_TYPE_OPTIONS, INVOICE_STATUS_CONFIG } from "../constants";
import type { FeeInvoice, FeeInvoiceStatus, RecordPaymentParams, RefundFormValues } from "../types";
import ApplyDiscountDialog from "./ApplyDiscountDialog";
import RecordPaymentDialog from "./RecordPaymentDialog";
import RefundDialog from "./RefundDialog";

const ALL_FILTER = "__all__";
const INSTALLMENT_COUNT = 3;

export default function InvoicesTab() {
  const queryClient = useQueryClient();

  const [classFilter, setClassFilter] = useState<string>(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState<FeeInvoiceStatus | typeof ALL_FILTER>(ALL_FILTER);
  const [payTarget, setPayTarget] = useState<FeeInvoice | null>(null);
  const [refundTarget, setRefundTarget] = useState<FeeInvoice | null>(null);
  const [discountTarget, setDiscountTarget] = useState<FeeInvoice | null>(null);

  const { data: invoices = [], isLoading } = useQuery({ queryKey: ["fees", "invoices"], queryFn: listInvoices });
  const { data: students = [] } = useQuery({ queryKey: ["students", "all"], queryFn: listStudents });
  const { data: structures = [] } = useQuery({ queryKey: ["fees", "structures"], queryFn: listFeeStructures });
  const { data: discounts = [] } = useQuery({ queryKey: ["fees", "discounts"], queryFn: listDiscounts });

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);
  const structureById = useMemo(() => new Map(structures.map((s) => [s.id, s] as const)), [structures]);
  const classNames = useMemo(() => Array.from(new Set(students.map((s) => s.className))).sort(), [students]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fees"] });

  const paymentMutation = useMutation({
    mutationFn: ({ invoiceId, values }: { invoiceId: string; values: RecordPaymentParams }) => recordPayment(invoiceId, values),
    onSuccess: () => {
      invalidate();
      toast.success("Payment recorded and receipt generated");
      setPayTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not record payment"),
  });

  const refundMutation = useMutation({
    mutationFn: (values: RefundFormValues) => requestRefund(values),
    onSuccess: () => {
      invalidate();
      toast.success("Refund request submitted");
      setRefundTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not submit refund request"),
  });

  const discountMutation = useMutation({
    mutationFn: ({ invoiceId, discountId }: { invoiceId: string; discountId: string }) => applyDiscountToInvoice(invoiceId, discountId),
    onSuccess: () => {
      invalidate();
      toast.success("Discount applied");
      setDiscountTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not apply discount"),
  });

  const installmentMutation = useMutation({
    mutationFn: (invoiceId: string) => generateInstallments(invoiceId, INSTALLMENT_COUNT),
    onSuccess: () => {
      invalidate();
      toast.success(`Split into ${INSTALLMENT_COUNT} installments`);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not generate installments"),
  });

  const filtered = invoices.filter((inv) => {
    const student = studentById.get(inv.studentId);
    if (classFilter !== ALL_FILTER && student?.className !== classFilter) return false;
    if (statusFilter !== ALL_FILTER && inv.status !== statusFilter) return false;
    return true;
  });

  const columns: ColumnDef<FeeInvoice, unknown>[] = [
    {
      id: "student",
      header: "Student",
      cell: ({ row }) => {
        const student = studentById.get(row.original.studentId);
        return (
          <div>
            <p className="text-sm font-medium text-slate-800">{student ? `${student.firstName} ${student.lastName}` : "Unknown student"}</p>
            <p className="text-xs text-slate-500">{student ? `${student.className} - ${student.section}` : ""}</p>
          </div>
        );
      },
    },
    {
      id: "feeType",
      header: "Fee type",
      cell: ({ row }) => <Badge variant="info">{FEE_TYPE_OPTIONS.find((o) => o.value === row.original.feeType)?.label}</Badge>,
    },
    { accessorKey: "term", header: "Term", cell: ({ row }) => <span className="text-sm text-slate-600">{row.original.term}</span> },
    {
      id: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div>
            <p className="text-sm font-medium text-slate-800 tabular-nums">{formatCurrency(inv.netAmount)}</p>
            {(inv.discountAmount > 0 || inv.fineAmount > 0) && (
              <p className="text-xs text-slate-500">
                {inv.discountAmount > 0 ? `-${formatCurrency(inv.discountAmount)} discount` : ""}
                {inv.discountAmount > 0 && inv.fineAmount > 0 ? " · " : ""}
                {inv.fineAmount > 0 ? `+${formatCurrency(inv.fineAmount)} fine` : ""}
              </p>
            )}
            {inv.paidAmount ? <p className="text-xs text-green-600">{formatCurrency(inv.paidAmount)} paid</p> : null}
          </div>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: "Due date",
      cell: ({ row }) => <span className="text-sm text-slate-600">{new Date(row.original.dueDate).toLocaleDateString()}</span>,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const config = INVOICE_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const invoice = row.original;
        const structure = structureById.get(invoice.feeStructureId);
        const canInstallments = structure && structure.frequency !== "one_time" && !invoice.installments && invoice.status !== "paid";
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {invoice.status !== "paid" && (
                <DropdownMenuItem onClick={() => setPayTarget(invoice)}>
                  <CreditCard className="w-3.5 h-3.5" />
                  Record payment
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setDiscountTarget(invoice)}>
                <Percent className="w-3.5 h-3.5" />
                Apply discount
              </DropdownMenuItem>
              {canInstallments && (
                <DropdownMenuItem onClick={() => installmentMutation.mutate(invoice.id)}>
                  <ListPlus className="w-3.5 h-3.5" />
                  Generate installments
                </DropdownMenuItem>
              )}
              {(invoice.paidAmount ?? 0) > 0 && (
                <DropdownMenuItem onClick={() => setRefundTarget(invoice)}>
                  <RotateCcw className="w-3.5 h-3.5" />
                  Refund
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <div className="flex items-center gap-2">
          <Select value={classFilter} onValueChange={setClassFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All classes" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All classes</SelectItem>
              {classNames.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FeeInvoiceStatus | typeof ALL_FILTER)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>All statuses</SelectItem>
              {(Object.entries(INVOICE_STATUS_CONFIG) as Array<[FeeInvoiceStatus, { label: string }]>).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{filtered.length} invoice(s)</p>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No invoices match the selected filters." />

      <RecordPaymentDialog
        open={Boolean(payTarget)}
        onOpenChange={(v) => !v && setPayTarget(null)}
        invoice={payTarget}
        submitting={paymentMutation.isPending}
        onSubmit={async (values) => {
          if (payTarget) await paymentMutation.mutateAsync({ invoiceId: payTarget.id, values });
        }}
      />

      <RefundDialog
        open={Boolean(refundTarget)}
        onOpenChange={(v) => !v && setRefundTarget(null)}
        invoice={refundTarget}
        submitting={refundMutation.isPending}
        onSubmit={async (values) => {
          await refundMutation.mutateAsync(values);
        }}
      />

      <ApplyDiscountDialog
        open={Boolean(discountTarget)}
        onOpenChange={(v) => !v && setDiscountTarget(null)}
        invoice={discountTarget}
        discounts={discounts}
        submitting={discountMutation.isPending}
        onSubmit={async (discountId) => {
          if (discountTarget) await discountMutation.mutateAsync({ invoiceId: discountTarget.id, discountId });
        }}
      />
    </div>
  );
}
