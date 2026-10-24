import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, PackageSearch, Wallet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { getInventoryValuation, getLowStockItems } from "../api";
import { useTranslation } from "react-i18next";

export default function ReportsTab() {
  const { t } = useTranslation("inventory");
  const { data: lowStock = [], isLoading: lowStockLoading } = useQuery({ queryKey: ["inventory", "low-stock"], queryFn: getLowStockItems });
  const { data: valuation, isLoading: valuationLoading } = useQuery({ queryKey: ["inventory", "valuation"], queryFn: getInventoryValuation });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("Total stock value")}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">
                {valuationLoading || !valuation ? "—" : formatCurrency(valuation.totalValue)}
              </p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-accent text-primary-text flex items-center justify-center shrink-0">
              <Wallet className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("Items tracked")}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{valuationLoading || !valuation ? "—" : valuation.totalItems}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-info-soft text-info-strong flex items-center justify-center shrink-0">
              <PackageSearch className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t("Items below reorder level")}</p>
              <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{lowStockLoading ? "—" : lowStock.length}</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-warning-soft text-warning-strong flex items-center justify-center shrink-0">
              <AlertTriangle className="w-[18px] h-[18px]" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader>
            <CardTitle>{t("Low stock alert")}</CardTitle>
            <CardDescription>{t("Items at or below their reorder level — restock soon.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!lowStockLoading && lowStock.length === 0 && <p className="text-sm text-muted-foreground">{t("Nothing is below its reorder level.")}</p>}
            {lowStock.map((item) => (
              <div key={item.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {item.code} &middot; {t("{{quantity}} in stock, reorder at {{level}}", { quantity: item.quantityInStock, level: item.reorderLevel })}
                  </p>
                </div>
                <Badge variant={item.quantityInStock === 0 ? "danger" : "warning"} className="shrink-0">
                  {item.quantityInStock === 0 ? t("Out of stock") : t("Short by {{shortBy}}", { shortBy: item.shortBy })}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Valuation by category")}</CardTitle>
            <CardDescription>{t("Current stock value, grouped by category.")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {!valuationLoading && (valuation?.rows.length ?? 0) === 0 && <p className="text-sm text-muted-foreground">{t("No stock on hand.")}</p>}
            {valuation?.rows.map((row) => (
              <div key={row.categoryId} className="flex items-center justify-between text-sm">
                <div>
                  <span className="text-foreground">{row.categoryName}</span>
                  <span className="text-xs text-muted-foreground ms-1.5">
                    {row.itemCount === 1
                      ? t("({{itemCount}} item, {{quantity}} units)", { itemCount: row.itemCount, quantity: row.totalQuantity })
                      : t("({{itemCount}} items, {{quantity}} units)", { itemCount: row.itemCount, quantity: row.totalQuantity })}
                  </span>
                </div>
                <span className="tabular-nums text-foreground font-medium">{formatCurrency(row.totalValue)}</span>
              </div>
            ))}
            {valuation && valuation.rows.length > 0 && (
              <div className="flex items-center justify-between text-sm font-semibold border-t border-border pt-2 mt-2">
                <span>{t("Total")}</span>
                <span className="tabular-nums">{formatCurrency(valuation.totalValue)}</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
