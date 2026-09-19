import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, PackageSearch, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { getInventoryValuation, getLowStockItems } from "../api";

export default function ReportsTab() {
  const { data: lowStock = [], isLoading: lowStockLoading } = useQuery({ queryKey: ["inventory", "low-stock"], queryFn: getLowStockItems });
  const { data: valuation, isLoading: valuationLoading } = useQuery({ queryKey: ["inventory", "valuation"], queryFn: getInventoryValuation });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Total stock value</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
                {valuationLoading || !valuation ? "—" : formatCurrency(valuation.totalValue)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
              <Wallet className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Items tracked</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{valuationLoading || !valuation ? "—" : valuation.totalItems}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <PackageSearch className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Items below reorder level</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{lowStockLoading ? "—" : lowStock.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>Low stock alert</CardTitle>
            <CardDescription>Items at or below their reorder level — restock soon.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!lowStockLoading && lowStock.length === 0 && <p className="text-sm text-muted-foreground">Nothing is below its reorder level.</p>}
            {lowStock.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500 truncate">
                    {item.code} &middot; {item.quantityInStock} in stock, reorder at {item.reorderLevel}
                  </p>
                </div>
                <Badge variant={item.quantityInStock === 0 ? "danger" : "warning"} className="shrink-0">
                  {item.quantityInStock === 0 ? "Out of stock" : `Short by ${item.shortBy}`}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Valuation by category</CardTitle>
            <CardDescription>Current stock value, grouped by category.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!valuationLoading && (valuation?.rows.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">No stock on hand.</p>}
            {valuation?.rows.map((row) => (
              <div key={row.categoryId} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-slate-700">{row.categoryName}</span>
                  <span className="text-xs text-slate-400 ml-1.5">
                    ({row.itemCount} item{row.itemCount === 1 ? "" : "s"}, {row.totalQuantity} units)
                  </span>
                </div>
                <span className="tabular-nums text-slate-800 font-medium">{formatCurrency(row.totalValue)}</span>
              </div>
            ))}
            {valuation && valuation.rows.length > 0 && (
              <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                <span>Total</span>
                <span className="tabular-nums">{formatCurrency(valuation.totalValue)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
