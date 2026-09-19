import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownCircle, ArrowUpCircle, SlidersHorizontal } from "lucide-react";
import toast from "react-hot-toast";
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
  const queryClient = useQueryClient();
  const { data: transactions = [], isLoading } = useQuery({ queryKey: ["inventory", "transactions"], queryFn: () => listTransactions() });
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
      toast.success("Stock in recorded");
      setStockInOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not record stock in"),
  });

  const issueMutation = useMutation({
    mutationFn: recordIssue,
    onSuccess: () => {
      invalidate();
      toast.success("Stock issued");
      setStockOutOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not issue stock"),
  });

  const adjustMutation = useMutation({
    mutationFn: recordAdjustment,
    onSuccess: () => {
      invalidate();
      toast.success("Adjustment recorded");
      setAdjustOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not record adjustment"),
  });

  const filtered = useMemo(
    () => (typeFilter === "all" ? transactions : transactions.filter((t) => t.type === typeFilter)),
    [transactions, typeFilter],
  );

  const columns: ColumnDef<StockTransactionRow, unknown>[] = [
    {
      id: "item",
      header: "Item",
      cell: ({ row }) => (
        <div>
          <p className="text-sm font-medium text-slate-800">{row.original.item.name}</p>
          <p className="text-xs text-slate-500">{row.original.item.code}</p>
        </div>
      ),
    },
    {
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const config = TRANSACTION_TYPE_CONFIG[row.original.type];
        return <Badge variant={config.variant}>{config.label}</Badge>;
      },
    },
    {
      id: "quantity",
      header: "Quantity",
      cell: ({ row }) => {
        const delta = row.original.quantityDelta;
        return (
          <span className={`text-sm font-medium tabular-nums ${delta > 0 ? "text-green-700" : "text-red-600"}`}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        );
      },
    },
    {
      id: "detail",
      header: "Detail",
      cell: ({ row }) => {
        const t = row.original;
        if (t.type === "purchase") return <span className="text-sm text-slate-600">{t.vendor?.name ?? "—"}</span>;
        if (t.type === "issue") return <span className="text-sm text-slate-600">{t.issuedTo}</span>;
        return <span className="text-sm text-slate-600 truncate max-w-xs block">{t.reason}</span>;
      },
    },
    {
      accessorKey: "date",
      header: "Date",
      cell: ({ row }) => <span className="text-sm text-slate-500">{formatRelativeDay(row.original.date)}</span>,
    },
  ];

  return (
    <div className="space-y-4">
      <DataTableToolbar>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="purchase">Purchase</SelectItem>
            <SelectItem value="issue">Issue</SelectItem>
            <SelectItem value="adjustment">Adjustment</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setAdjustOpen(true)}>
            <SlidersHorizontal className="w-4 h-4" />
            Adjust stock
          </Button>
          <Button variant="outline" onClick={() => setStockOutOpen(true)}>
            <ArrowUpCircle className="w-4 h-4" />
            Issue stock
          </Button>
          <Button onClick={() => setStockInOpen(true)}>
            <ArrowDownCircle className="w-4 h-4" />
            Stock in
          </Button>
        </div>
      </DataTableToolbar>

      <DataTable columns={columns} data={filtered} isLoading={isLoading} emptyMessage="No stock transactions yet." pageSize={10} />

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
