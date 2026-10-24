import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { listStudents } from "@/features/students/api";
import { formatCurrency } from "@/utils/format";
import { listInvoices, listRefunds, processRefund } from "../api";
import { GATEWAY_REFUND_STATUS_CONFIG, REFUND_STATUS_CONFIG } from "../constants";
import { sendRefundToGateway } from "../gatewayApi";
import type { Refund } from "../types";

export default function RefundsTab() {
  const { t } = useTranslation("fees");
  const queryClient = useQueryClient();

  const { data: refunds = [], isLoading, isError, refetch } = useQuery({ queryKey: ["fees", "refunds"], queryFn: listRefunds });
  const { data: invoices = [] } = useQuery({ queryKey: ["fees", "invoices"], queryFn: listInvoices });
  const { data: students = [] } = useQuery({ queryKey: ["students", "all"], queryFn: listStudents });

  const invoiceById = useMemo(() => new Map(invoices.map((inv) => [inv.id, inv] as const)), [invoices]);
  const studentById = useMemo(() => new Map(students.map((s) => [s.id, s] as const)), [students]);

  const processMutation = useMutation({
    mutationFn: processRefund,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      toast.success(t("Refund marked as processed"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not process refund")),
  });

  const sendMutation = useMutation({
    mutationFn: sendRefundToGateway,
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["fees"] });
      if (result.gatewayStatus === "succeeded") toast.success(t("Refunded to the payer's account"));
      else if (result.gatewayStatus === "failed") toast.error(result.gatewayError ?? t("The gateway refused the refund"));
      else toast.success(t("Sent to the gateway. It is marked processed when the gateway confirms it."));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not send the refund to the gateway")),
  });

  const columns: ColumnDef<Refund, unknown>[] = [
    {
      id: "student",
      header: t("Student"),
      cell: ({ row }) => {
        const invoice = invoiceById.get(row.original.invoiceId);
        const student = invoice ? studentById.get(invoice.studentId) : undefined;
        return (
          <div>
            <p className="text-sm font-medium text-foreground">{student ? `${student.firstName} ${student.lastName}` : "—"}</p>
            <p className="text-xs text-muted-foreground">{invoice ? `${invoice.term} · ${invoice.feeType}` : ""}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "amount",
      header: t("Amount"),
      cell: ({ row }) => <span className="text-sm text-foreground tabular-nums">{formatCurrency(row.original.amount)}</span>,
    },
    { accessorKey: "reason", header: t("Reason"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.reason}</span> },
    {
      accessorKey: "refundedOn",
      header: t("Date"),
      cell: ({ row }) => <span className="text-sm text-secondary-foreground">{new Date(row.original.refundedOn).toLocaleDateString()}</span>,
    },
    {
      accessorKey: "status",
      header: t("Status"),
      cell: ({ row }) => {
        const config = REFUND_STATUS_CONFIG[row.original.status];
        const gateway = GATEWAY_REFUND_STATUS_CONFIG[row.original.gatewayStatus];
        return (
          <div className="space-y-1">
            <Badge variant={config.variant}>{t(config.label)}</Badge>
            {gateway && <Badge variant={gateway.variant}>{t(gateway.label)}</Badge>}
            {row.original.gatewayStatus === "failed" || row.original.gatewayStatus === "initiated"
              ? row.original.gatewayError && <p className="text-xs text-destructive-strong">{row.original.gatewayError}</p>
              : null}
          </div>
        );
      },
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const refund = row.original;
        if (refund.status !== "pending") return null;
        const withGateway = refund.gatewayStatus === "initiated";
        return (
          <div className="flex justify-end gap-1">
            {!withGateway && (
              <Button variant="ghost" size="sm" onClick={() => sendMutation.mutate(refund.id)} disabled={sendMutation.isPending} title={t("Refund to the card, UPI or bank account it was paid from")}>
                <Send className="w-3.5 h-3.5" />
                {refund.gatewayStatus === "failed" ? t("Send again") : t("Refund to payer")}
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => processMutation.mutate(refund.id)}
              disabled={processMutation.isPending || withGateway}
              title={withGateway ? t("The gateway is handling this refund. It is marked processed when it confirms.") : undefined}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t("Mark processed")}
            </Button>
          </div>
        );
      },
    },
  ];

  const sorted = [...refunds].sort((a, b) => new Date(b.refundedOn).getTime() - new Date(a.refundedOn).getTime());

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Refund requests raised from student invoices.")}</p>
      </DataTableToolbar>
      <DataTable searchable columns={columns} data={sorted} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No refunds recorded yet.")} />
    </div>
  );
}
