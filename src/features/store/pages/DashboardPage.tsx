import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeftRight, Boxes, ClipboardList, FileClock, IndianRupee, PackageX, PackageCheck, Receipt, ShoppingCart, Warehouse, Wallet } from "lucide-react";
import { Link } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { CHART_GRID, CHART_LEGEND_STYLE, CHART_TICK, CHART_TOOLTIP_STYLE } from "@/features/dashboard/chartTheme";
import { getDashboard } from "../api";
import { ISSUE_STATUS_LABEL, MOVEMENT_LABEL, RECIPIENT_LABEL, SALE_STATUS_LABEL } from "../constants";
import { StoreSelect, formatDate, formatDateTime, money, qty } from "../shared";

export default function DashboardPage() {
  const { t } = useTranslation("store");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [storeId, setStoreId] = useState<string | undefined>();
  const dashboard = useQuery({ queryKey: ["store", "dashboard", from, to, storeId], queryFn: () => getDashboard(from || undefined, to || undefined, storeId) });
  const d = dashboard.data;

  if (dashboard.isError) return <ErrorState onRetry={() => dashboard.refetch()} retrying={dashboard.isFetching} />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3">
        <div className="w-44">
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="store-dash-from">{t("From")}</label>
          <Input id="store-dash-from" type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="w-44">
          <label className="mb-1 block text-xs text-muted-foreground" htmlFor="store-dash-to">{t("To")}</label>
          <Input id="store-dash-to" type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="w-56">
          <span className="mb-1 block text-xs text-muted-foreground">{t("Store")}</span>
          <StoreSelect value={storeId} onChange={setStoreId} allLabel={t("All stores")} />
        </div>
        {(from || to || storeId) && (
          <Button variant="ghost" onClick={() => { setFrom(""); setTo(""); setStoreId(undefined); }}>{t("Clear filters")}</Button>
        )}
        {d && <p className="ml-auto text-xs text-muted-foreground">{t("Showing {{from}} to {{to}}", { from: formatDate(d.from), to: formatDate(d.to) })}</p>}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t("Items")} value={d ? qty(d.totalItems) : "—"} hint={d ? t("{{count}} stores", { count: d.stores }) : undefined} icon={Boxes} loading={dashboard.isLoading} />
        <StatCard label={t("Units in stock")} value={d ? qty(d.totalQuantity) : "—"} icon={PackageCheck} tone="info" loading={dashboard.isLoading} />
        <StatCard label={t("Inventory value")} value={d ? money(d.totalValue) : "—"} hint={t("At average cost")} icon={IndianRupee} tone="success" loading={dashboard.isLoading} />
        <StatCard label={t("Low stock")} value={d?.lowStockItems ?? "—"} hint={t("At or below the minimum")} icon={AlertTriangle} tone="warning" loading={dashboard.isLoading} />
        <StatCard label={t("Out of stock")} value={d?.outOfStockItems ?? "—"} icon={PackageX} tone="danger" loading={dashboard.isLoading} />
        <StatCard label={t("Requisitions to approve")} value={d?.pendingRequisitions ?? "—"} icon={ClipboardList} tone="warning" loading={dashboard.isLoading} />
        <StatCard label={t("Open purchase orders")} value={d?.pendingPurchaseOrders ?? "—"} hint={d ? t("{{count}} receipts to approve", { count: d.pendingReceipts }) : undefined} icon={ShoppingCart} loading={dashboard.isLoading} />
        <StatCard label={t("Issue requests")} value={d?.pendingIssues ?? "—"} hint={d ? t("{{count}} overdue returns, {{returns}} return requests", { count: d.overdueIssues, returns: d.pendingReturns }) : undefined} icon={ArrowLeftRight} loading={dashboard.isLoading} />
        <StatCard label={t("Owed to suppliers")} value={d ? money(d.supplierDue) : "—"} hint={d ? t("{{count}} invoices overdue", { count: d.overdueInvoices }) : undefined} icon={Wallet} tone={d && d.overdueInvoices > 0 ? "danger" : "neutral"} loading={dashboard.isLoading} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{t("Purchases and consumption")}</CardTitle>
            <CardDescription>{t("Value of goods received, and of items issued or sold, by month")}</CardDescription>
          </CardHeader>
          <CardContent>
            {d && d.monthly.every((m) => m.purchases === 0 && m.consumption === 0) ? (
              <EmptyState bare size="sm" icon={Warehouse} title={t("No movement in this period")} className="h-64" />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={d?.monthly ?? []} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <CartesianGrid {...CHART_GRID} />
                    <XAxis dataKey="month" tickLine={false} axisLine={false} tick={CHART_TICK} />
                    <YAxis tickLine={false} axisLine={false} tick={CHART_TICK} width={56} />
                    <Tooltip contentStyle={CHART_TOOLTIP_STYLE} formatter={(v) => money(Number(v))} />
                    <Legend wrapperStyle={CHART_LEGEND_STYLE} />
                    <Bar dataKey="purchases" name={t("Purchased")} fill="var(--color-brand-500)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="consumption" name={t("Issued and sold")} fill="var(--color-warning, #f59e0b)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="sales" name={t("Sold")} fill="var(--color-success, #16a34a)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("Stock value by category")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {(d?.byCategory ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("No stock yet.")}</p>}
            {(d?.byCategory ?? []).slice(0, 8).map((c) => {
              const max = d!.byCategory[0].value || 1;
              return (
                <div key={c.category}>
                  <div className="flex justify-between text-sm"><span className="truncate">{c.category}</span><span className="tabular-nums">{money(c.value)}</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-1.5 rounded-full bg-primary" style={{ width: `${Math.max(3, (c.value / max) * 100)}%` }} /></div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>{t("Items to reorder")}</CardTitle><CardDescription>{t("Closest to running out first")}</CardDescription></CardHeader>
          <CardContent className="space-y-2">
            {(d?.lowStock ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("Everything with a minimum level is above it.")}</p>}
            {(d?.lowStock ?? []).map((i) => (
              <div key={i.itemId} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0"><p className="truncate font-medium">{i.itemName}</p><p className="text-xs text-muted-foreground">{i.sku}</p></div>
                <Badge variant="warning">{t("{{qty}} of minimum {{min}} {{unit}}", { qty: qty(i.quantity), min: qty(i.minStock), unit: i.unit })}</Badge>
              </div>
            ))}
            {(d?.lowStock ?? []).length > 0 && <Link to="/store/items?low=1" className="text-sm text-primary hover:underline">{t("See all low-stock items")}</Link>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("Recent stock movements")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(d?.recentMovements ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("Nothing has moved in this period.")}</p>}
            {(d?.recentMovements ?? []).map((m) => (
              <div key={m.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0"><p className="truncate font-medium">{m.itemName}</p><p className="text-xs text-muted-foreground">{t(MOVEMENT_LABEL[m.type])} · {m.reference} · {formatDateTime(m.at)}</p></div>
                <span className={m.quantityChange < 0 ? "tabular-nums text-destructive-strong" : "tabular-nums text-success-strong"}>{m.quantityChange > 0 ? "+" : ""}{qty(m.quantityChange)}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("Recent issues")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(d?.recentIssues ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("No items issued yet.")}</p>}
            {(d?.recentIssues ?? []).map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0"><p className="truncate font-medium">{i.recipientName}</p><p className="text-xs text-muted-foreground">{t(RECIPIENT_LABEL[i.recipientType])} · {i.reference} · {formatDate(i.issueDate)}</p></div>
                <StatusBadge status={i.status} label={t(ISSUE_STATUS_LABEL[i.status])} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>{t("Recent sales")}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(d?.recentSales ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("No sales yet.")}</p>}
            {(d?.recentSales ?? []).map((s) => (
              <div key={s.id} className="flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0"><p className="truncate font-medium">{s.buyerName}</p><p className="text-xs text-muted-foreground">{s.reference} · {formatDateTime(s.soldAt)}</p></div>
                <div className="flex items-center gap-2"><span className="tabular-nums">{money(s.total)}</span><StatusBadge status={s.paymentStatus} label={t(SALE_STATUS_LABEL[s.paymentStatus])} /></div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
      <p className="flex items-center gap-1 text-xs text-muted-foreground"><Receipt className="h-3 w-3" /><FileClock className="h-3 w-3" />{t("Figures come from the stock ledger, so they always agree with the Stock Management screen.")}</p>
    </div>
  );
}
