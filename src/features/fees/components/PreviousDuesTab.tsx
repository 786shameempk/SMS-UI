import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CreditCard, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { usePageIndex } from "@/components/tables/usePageIndex";
import { RowActions } from "@/components/ui/row-actions";
import { listStudentsByIds } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import { addPreviousDues, listInvoicesPage, recordPayment } from "../api";
import { INVOICE_STATUS_CONFIG } from "../constants";
import type { AddPreviousDuesParams, FeeInvoice, RecordPaymentParams } from "../types";
import PreviousDuesDialog from "./PreviousDuesDialog";
import RecordPaymentDialog from "./RecordPaymentDialog";

const PAGE_SIZE = 25;

/** Balances carried forward from earlier years (or from before the school used this system). */
export default function PreviousDuesTab() {
  const { t } = useTranslation("fees");
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [payTarget, setPayTarget] = useState<FeeInvoice | null>(null);
  const [pageIndex, setPageIndex] = usePageIndex("previous-dues");

  const filters = { pageIndex, pageSize: PAGE_SIZE, feeType: "previous_dues" as const };
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
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["fees"] });

  const addMutation = useMutation({
    mutationFn: (values: AddPreviousDuesParams) => addPreviousDues(values),
    onSuccess: (result) => {
      invalidate();
      toast.success(
        result.skippedCount > 0
          ? t("{{created}} added, {{skipped}} skipped (already recorded under this name)", { created: result.createdCount, skipped: result.skippedCount })
          : t("{{count}} previous dues added", { count: result.createdCount }),
      );
      setAddOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not add previous dues")),
  });

  const paymentMutation = useMutation({
    mutationFn: ({ invoiceId, values }: { invoiceId: string; values: RecordPaymentParams }) => recordPayment(invoiceId, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Payment recorded and receipt generated"));
      setPayTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not record payment")),
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
    { accessorKey: "term", header: t("Dues from"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.term}</span> },
    {
      id: "amount",
      header: t("Amount"),
      cell: ({ row }) => {
        const inv = row.original;
        return (
          <div>
            <p className="text-sm font-medium text-foreground tabular-nums">{formatCurrency(inv.netAmount)}</p>
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
      cell: ({ row }) =>
        row.original.status === "paid" ? null : (
          <RowActions>
            <DropdownMenuItem onClick={() => setPayTarget(row.original)}>
              <CreditCard className="w-3.5 h-3.5" />
              {t("Record payment")}
            </DropdownMenuItem>
          </RowActions>
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">
          {t("Old balances from earlier years, or from before your school used SchoolSphere. {{count}} record(s)", { count: page?.totalCount ?? 0 })}
        </p>
        <Button onClick={() => setAddOpen(true)}>
          <Plus className="w-4 h-4" />
          {t("Add previous dues")}
        </Button>
      </DataTableToolbar>

      <DataTable
        columns={columns}
        data={invoices}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => refetch()}
        emptyMessage={t("No previous dues recorded.")}
        serverPagination={{ pageIndex, pageSize: PAGE_SIZE, totalCount: page?.totalCount ?? 0, onPageChange: setPageIndex }}
      />

      <PreviousDuesDialog open={addOpen} onOpenChange={setAddOpen} submitting={addMutation.isPending} onSubmit={async (values) => void (await addMutation.mutateAsync(values))} />

      <RecordPaymentDialog
        open={Boolean(payTarget)}
        onOpenChange={(v) => !v && setPayTarget(null)}
        invoice={payTarget}
        submitting={paymentMutation.isPending}
        onSubmit={async (values) => {
          if (payTarget) await paymentMutation.mutateAsync({ invoiceId: payTarget.id, values });
        }}
      />
    </div>
  );
}
