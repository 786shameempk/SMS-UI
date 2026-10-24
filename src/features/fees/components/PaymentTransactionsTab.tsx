import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency, formatDateTime } from "@/utils/format";
import { listPaymentTransactions, reconcileOnlinePayments, type PaymentTransaction, type PaymentTransactionKind } from "../gatewayApi";

const KIND: Record<PaymentTransactionKind, { label: string; variant: BadgeVariant }> = {
  OrderCreated: { label: "Checkout opened", variant: "neutral" },
  PaymentCaptured: { label: "Payment received", variant: "success" },
  PaymentFailed: { label: "Payment failed", variant: "danger" },
  RefundInitiated: { label: "Refund sent", variant: "info" },
  RefundSucceeded: { label: "Refund completed", variant: "success" },
  RefundFailed: { label: "Refund failed", variant: "danger" },
  WebhookReceived: { label: "Gateway notice", variant: "default" },
};

const PAGE_SIZE = 50;

/** The append-only gateway ledger: every checkout, payment, refund and verified webhook, with a button to ask the gateways about anything unconfirmed. */
export default function PaymentTransactionsTab() {
  const { t } = useTranslation("fees");
  const queryClient = useQueryClient();
  const [kind, setKind] = useState<PaymentTransactionKind | "all">("all");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["fees", "gateway-transactions", kind, page],
    queryFn: () => listPaymentTransactions({ kind: kind === "all" ? undefined : kind, page, pageSize: PAGE_SIZE }),
  });

  const reconcile = useMutation({
    mutationFn: reconcileOnlinePayments,
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ["fees"] });
      if (result.needAttention > 0) toast.error(t("{{count}} could not be settled automatically. See the notes below the table.", { count: result.needAttention }), { duration: 8000 });
      else toast.success(t("Checked {{orders}} orders and {{refunds}} refunds; {{recorded}} payments and {{settled}} refunds were recorded.", {
        orders: result.ordersChecked, refunds: result.refundsChecked, recorded: result.recorded, settled: result.refundsSettled,
      }));
      setNotes(result.notes);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not check with the gateways")),
  });
  const [notes, setNotes] = useState<string[]>([]);

  const columns: ColumnDef<PaymentTransaction, unknown>[] = [
    { id: "at", header: t("When"), cell: ({ row }) => <span className="text-sm text-secondary-foreground">{formatDateTime(row.original.at)}</span> },
    {
      id: "kind",
      header: t("What happened"),
      cell: ({ row }) => {
        const config = KIND[row.original.kind] ?? { label: row.original.kind, variant: "default" as const };
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
    },
    {
      id: "gateway",
      header: t("Gateway"),
      cell: ({ row }) => (
        <span className="text-sm capitalize text-foreground">
          {row.original.provider}
          {row.original.mode === "Test" && <span className="ms-1.5 text-[11px] text-warning-strong">{t("test")}</span>}
        </span>
      ),
    },
    {
      id: "amount",
      header: t("Amount"),
      cell: ({ row }) => <span className="text-sm tabular-nums text-foreground">{row.original.amount ? formatCurrency(row.original.amount) : "—"}</span>,
    },
    {
      id: "reference",
      header: t("Gateway reference"),
      cell: ({ row }) => (
        <span className="text-xs text-muted-foreground" dir="ltr">
          {row.original.providerReference ?? "—"}
          {row.original.status ? ` · ${row.original.status}` : ""}
        </span>
      ),
    },
    { id: "detail", header: t("Note"), cell: ({ row }) => <span className="text-xs text-muted-foreground">{row.original.detail ?? ""}</span> },
  ];

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <p className="text-sm text-muted-foreground">{t("Everything that happened with the payment gateways. Entries are never edited or removed.")}</p>
        <div className="flex items-center gap-2">
          <Select
            value={kind}
            onValueChange={(value) => {
              setKind(value as PaymentTransactionKind | "all");
              setPage(1);
            }}
          >
            <SelectTrigger className="w-48" aria-label={t("Filter by what happened")}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t("Everything")}</SelectItem>
              {(Object.keys(KIND) as PaymentTransactionKind[]).map((k) => (
                <SelectItem key={k} value={k}>
                  {t(KIND[k].label)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="button" variant="outline" onClick={() => reconcile.mutate()} loading={reconcile.isPending}>
            <RefreshCw className="h-4 w-4" /> {t("Check with gateways")}
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable columns={columns} data={data?.items ?? []} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No gateway activity yet.")} />

      {total > PAGE_SIZE && (
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          <Button type="button" size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            {t("Previous")}
          </Button>
          <span>{t("Page {{current}} of {{total}}", { current: page, total: pages })}</span>
          <Button type="button" size="sm" variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>
            {t("Next")}
          </Button>
        </div>
      )}

      {notes.length > 0 && (
        <ul className="space-y-1 rounded-xl border border-warning/30 bg-warning-soft px-4 py-3 text-xs text-warning-strong" aria-label={t("Reconciliation notes")}>
          {notes.map((note) => (
            <li key={note}>{note}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
