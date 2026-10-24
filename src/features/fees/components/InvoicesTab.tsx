import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, ListPlus, Percent, RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { usePageIndex } from "@/components/tables/usePageIndex";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listClasses } from "@/features/academics/api";
import { listStudentsByIds } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import {
  applyDiscountToInvoice,
  generateInstallments,
  listDiscounts,
  listFeeStructures,
  listInvoicesPage,
  recordPayment,
  requestRefund,
} from "../api";
import { FEE_TYPE_OPTIONS, INVOICE_STATUS_CONFIG } from "../constants";
import type { FeeInvoice, FeeInvoiceStatus, RecordPaymentParams, RefundFormValues } from "../types";
import ApplyDiscountDialog from "./ApplyDiscountDialog";
import RecordPaymentDialog from "./RecordPaymentDialog";
import RefundDialog from "./RefundDialog";
import { RowActions } from "@/components/ui/row-actions";

const ALL_FILTER = "__all__";
const INSTALLMENT_COUNT = 3;
const PAGE_SIZE = 25;

export default function InvoicesTab() {
  const { t } = useTranslation("fees");
  const queryClient = useQueryClient();
  const translateLabel = (label: string | undefined) => (label ? t(label) : label);

  const [classFilter, setClassFilter] = useState<string>(ALL_FILTER);
  const [statusFilter, setStatusFilter] = useState<FeeInvoiceStatus | typeof ALL_FILTER>(ALL_FILTER);
  const [payTarget, setPayTarget] = useState<FeeInvoice | null>(null);
  const [refundTarget, setRefundTarget] = useState<FeeInvoice | null>(null);
  const [discountTarget, setDiscountTarget] = useState<FeeInvoice | null>(null);

  const [pageIndex, setPageIndex] = usePageIndex(JSON.stringify([classFilter, statusFilter]));

  // Filtering and paging happen in FinanceService; only the visible page is downloaded, plus the names of
  // just the students on it.
  const filters = {
    pageIndex,
    pageSize: PAGE_SIZE,
    classId: classFilter === ALL_FILTER ? undefined : classFilter,
    status: statusFilter === ALL_FILTER ? undefined : statusFilter,
  };
  const { data: page, isLoading, isError, refetch } = useQuery({
    queryKey: ["fees", "invoices", "page", filters],
    queryFn: () => listInvoicesPage(filters),
    placeholderData: keepPreviousData,
  });
  const invoices = useMemo(() => page?.items ?? [], [page]);
  const studentIds = useMemo(() => [...new Set(invoices.map((inv) => inv.studentId))].sort(), [invoices]);
  const { data: students = [] } = useQuery({
    queryKey: ["students", "byIds", studentIds],
    queryFn: () => listStudentsByIds(studentIds),
    enabled: studentIds.length > 0,
    placeholderData: keepPreviousData,
  });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: structures = [] } = useQuery({ queryKey: ["fees", "structures"], queryFn: listFeeStructures });
  const { data: discounts = [] } = useQuery({ queryKey: ["fees", "discounts"], queryFn: listDiscounts });

  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);
  const structureById = useMemo(() => new Map(structures.map((s) => [s.id, s] as const)), [structures]);
  const classOptions = useMemo(
    () => [...classes].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true })),
    [classes],
  );

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fees"] });

  const paymentMutation = useMutation({
    mutationFn: ({ invoiceId, values }: { invoiceId: string; values: RecordPaymentParams }) => recordPayment(invoiceId, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Payment recorded and receipt generated"));
      setPayTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not record payment")),
  });

  const refundMutation = useMutation({
    mutationFn: (values: RefundFormValues) => requestRefund(values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Refund request submitted"));
      setRefundTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not submit refund request")),
  });

  const discountMutation = useMutation({
    mutationFn: ({ invoiceId, discountId }: { invoiceId: string; discountId: string }) => applyDiscountToInvoice(invoiceId, discountId),
    onSuccess: () => {
      invalidate();
      toast.success(t("Discount applied"));
      setDiscountTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not apply discount")),
  });

  const installmentMutation = useMutation({
    mutationFn: (invoiceId: string) => generateInstallments(invoiceId, INSTALLMENT_COUNT),
    onSuccess: () => {
      invalidate();
      toast.success(t("Split into {{count}} installments", { count: INSTALLMENT_COUNT }));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not generate installments")),
  });

  const columns: ColumnDef<FeeInvoice, unknown>[] = [
    {
      id: "student",
      header: t("Student"),
      cell: ({ row }) => {
        const student = studentById.get(row.original.studentId);
        return (
          <div>
            <p className="text-sm font-medium text-foreground">{student ? `${student.firstName} ${student.lastName}` : t("Unknown student")}</p>
            <p className="text-xs text-muted-foreground">{student ? `${student.className} - ${student.section}` : ""}</p>
          </div>
        );
      },
    },
    {
      id: "feeType",
      header: t("Fee type"),
      cell: ({ row }) => <Badge variant="info">{translateLabel(FEE_TYPE_OPTIONS.find((o) => o.value === row.original.feeType)?.label)}</Badge>,
    },
    { accessorKey: "term", header: t("Term"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.term}</span> },
    {
      id: "amount",
      header: t("Amount"),
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div>
            <p className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(inv.netAmount)}</p>
            {(inv.discountAmount > 0 || inv.fineAmount > 0) && (
              <p className="text-xs text-muted-foreground">
                {inv.discountAmount > 0 ? t("-{{amount}} discount", { amount: formatCurrency(inv.discountAmount) }) : ""}
                {inv.discountAmount > 0 && inv.fineAmount > 0 ? " · " : ""}
                {inv.fineAmount > 0 ? t("+{{amount}} fine", { amount: formatCurrency(inv.fineAmount) }) : ""}
              </p>
            )}
            {inv.paidAmount ? <p className="text-xs text-success-strong">{t("{{amount}} paid", { amount: formatCurrency(inv.paidAmount) })}</p> : null}
          </div>
        );
      },
    },
    {
      accessorKey: "dueDate",
      header: t("Due date"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{new Date(row.original.dueDate).toLocaleDateString()}</span>,
    },
    {
      accessorKey: "status",
      header: t("Status"),
      cell: ({ row }) => {
        const config = INVOICE_STATUS_CONFIG[row.original.status];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
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
          <RowActions>
            {invoice.status !== "paid" && (
              <DropdownMenuItem onClick={() => setPayTarget(invoice)}>
                <CreditCard className="w-3.5 h-3.5" />
                {t("Record payment")}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setDiscountTarget(invoice)}>
              <Percent className="w-3.5 h-3.5" />
              {t("Apply discount")}
            </DropdownMenuItem>
            {canInstallments && (
              <DropdownMenuItem onClick={() => installmentMutation.mutate(invoice.id)}>
                <ListPlus className="w-3.5 h-3.5" />
                {t("Generate installments")}
              </DropdownMenuItem>
            )}
            {(invoice.paidAmount ?? 0) > 0 && (
              <DropdownMenuItem onClick={() => setRefundTarget(invoice)}>
                <RotateCcw className="w-3.5 h-3.5" />
                {t("Refund")}
              </DropdownMenuItem>
            )}
          </RowActions>
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
              <SelectValue placeholder={t("All classes")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>{t("All classes")}</SelectItem>
              {classOptions.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FeeInvoiceStatus | typeof ALL_FILTER)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder={t("All statuses")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER}>{t("All statuses")}</SelectItem>
              {(Object.entries(INVOICE_STATUS_CONFIG) as Array<[FeeInvoiceStatus, { label: string }]>).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {t(config.label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">{t("{{count}} invoice(s)", { count: page?.totalCount ?? 0 })}</p>
      </DataTableToolbar>

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyMessage={t("No invoices match the selected filters.")}
        serverPagination={{ pageIndex, pageSize: PAGE_SIZE, totalCount: page?.totalCount ?? 0, onPageChange: setPageIndex }}
      />

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
