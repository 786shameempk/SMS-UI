import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable, DataTableToolbar } from "@/components/tables/DataTable";
import { formatRelativeDay } from "@/utils/format";
import { TRANSACTION_TYPE_CONFIG } from "../constants";
import { listItems, listTransactions, listVendors, recordAdjustment, recordIssue, recordPurchase } from "../api";
import type { StockAdjustmentFormValues, StockInFormValues, StockOutFormValues, StockTransactionRow } from "../types";
import StockInDialog from "./StockInDialog";
import StockOutDialog from "./StockOutDialog";
import StockAdjustmentDialog from "./StockAdjustmentDialog";

export default function StockTransactionsTab() {
  const { t } = useTranslation("inventory");
  const queryClient = useQueryClient();
  const { data: transactions = [], isLoading, isError, refetch } = useQuery({ queryKey: ["inventory", "transactions"], queryFn: () => listTransactions() });
  const { data: items = [] } = useQuery({ queryKey: ["inventory", "items"], queryFn: listItems });
  const { data: vendors = [] } = useQuery({ queryKey: ["inventory", "vendors"], queryFn: listVendors });

  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [stockInOpen, setStockInOpen] = useState(false);
  const [stockOutOpen, setStockOutOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory"] });

  const purchaseMutation = useMutation({
    mutationFn: recordPurchase,
    onSuccess: () => {
      invalidate();
      toast.success(t("Stock in recorded"));
      setStockInOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not record stock in")),
  });

  const issueMutation = useMutation({
    mutationFn: recordIssue,
    onSuccess: () => {
      invalidate();
      toast.success(t("Stock issued"));
      setStockOutOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not issue stock")),
  });

  const adjustMutation = useMutation({
    mutationFn: recordAdjustment,
    onSuccess: () => {
      invalidate();
      toast.success(t("Adjustment recorded"));
      setAdjustOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not record adjustment")),
  });

  const filtered = useMemo(
    () => (typeFilter === "all" ? transactions : transactions.filter((tx) => tx.type === typeFilter)),
    [transactions, typeFilter],
  );

  const columns: ColumnDef<StockTransactionRow, unknown>[] = [
    {
      id: "item",
      header: t("Item"),
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-foreground">{row.original.item.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.item.code}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: t("Type"),
      cell: ({ row }) => {
        const config = TRANSACTION_TYPE_CONFIG[row.original.type];
        return <Badge variant={config.variant}>{t(config.label)}</Badge>;
      },
    },
    {
      id: "quantity",
      header: t("Quantity"),
      cell: ({ row }) => {
        const delta = row.original.quantityDelta;
        return (
          <span className={`text-sm font-medium tabular-nums ${delta > 0 ? "text-success-strong" : "text-destructive-strong"}`}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        );
      },
    },
    {
      id: "detail",
      header: t("Detail"),
      cell: ({ row }) => {
        const tx = row.original;
        if (tx.type === "purchase") return <span className="text-sm text-secondary-foreground">{tx.vendor?.name ?? "—"}</span>;
        if (tx.type === "issue") return <span className="text-sm text-secondary-foreground">{tx.issuedTo}</span>;
        return <span className="text-sm text-secondary-foreground truncate max-w-xs block">{tx.reason}</span>;
      },
    },
    {
      accessorKey: "date",
      header: t("Date"),
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{formatRelativeDay(row.original.date)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder={t("Type")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("All types")}</SelectItem>
            <SelectItem value="purchase">{t("Purchase")}</SelectItem>
            <SelectItem value="issue">{t("Issue")}</SelectItem>
            <SelectItem value="adjustment">{t("Adjustment")}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAdjustOpen(true)}>
            <SlidersHorizontal className="w-4 h-4" />
            {t("Adjust stock")}
          </Button>
          <Button variant="outline" onClick={() => setStockOutOpen(true)}>
            <ArrowUpCircle className="w-4 h-4" />
            {t("Issue stock")}
          </Button>
          <Button onClick={() => setStockInOpen(true)}>
            <ArrowDownCircle className="w-4 h-4" />
            {t("Stock in")}
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable searchable columns={columns} data={filtered} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage={t("No stock transactions yet.")} pageSize={10} />

      <StockInDialog
        open={stockInOpen}
        onOpenChange={setStockInOpen}
        items={items}
        vendors={vendors}
        submitting={purchaseMutation.isPending}
        onSubmit={async (values: StockInFormValues) => {
          await purchaseMutation.mutateAsync(values);
        }}
      />

      <StockOutDialog
        open={stockOutOpen}
        onOpenChange={setStockOutOpen}
        items={items}
        submitting={issueMutation.isPending}
        onSubmit={async (values: StockOutFormValues) => {
          await issueMutation.mutateAsync(values);
        }}
      />

      <StockAdjustmentDialog
        open={adjustOpen}
        onOpenChange={setAdjustOpen}
        items={items}
        submitting={adjustMutation.isPending}
        onSubmit={async (values: StockAdjustmentFormValues) => {
          await adjustMutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
