import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, BarChart3, Bell, Boxes, ChevronDown, ClipboardList, FolderTree, LayoutDashboard, PackageCheck, PackageSearch, Receipt, Plus, ShoppingCart, Store, Truck, Undo2, Warehouse, type LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageContainer, PageHeader } from "@/components/ui/page";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { tabKey, useSubMenuStore } from "@/store/subMenuStore";
import { cn } from "@/utils/cn";
import { getDashboard, listNotifications, markNotificationsRead } from "../api";
import { NOTIFICATION_LABEL } from "../constants";
import { formatDateTime, useApiMutation, useStoreAccess, type StoreAccess } from "../shared";

export const GROUPS = ["Overview", "Master data", "Purchasing", "Stock and distribution", "Sales and insight"] as const;

interface Section {
  /** Entry value in Roles & permissions → Sub-menus (with the route id store.home). */
  key: string;
  to: string;
  label: string;
  icon: LucideIcon;
  group: (typeof GROUPS)[number];
  end?: boolean;
  allowed: (a: StoreAccess) => boolean;
}

/** The menu entries a person sees follow what they may do: nothing is shown that the server would refuse. */
export const SECTIONS: Section[] = [
  { key: "dashboard", to: "/store", label: "Dashboard", icon: LayoutDashboard, group: "Overview", end: true, allowed: (a) => a.canView },
  { key: "stores", to: "/store/stores", label: "Stores & Warehouses", icon: Warehouse, group: "Master data", allowed: (a) => a.canView },
  { key: "items", to: "/store/items", label: "Items", icon: Boxes, group: "Master data", allowed: (a) => a.canView || a.request },
  { key: "categories", to: "/store/categories", label: "Categories", icon: FolderTree, group: "Master data", allowed: (a) => a.canView },
  { key: "suppliers", to: "/store/suppliers", label: "Suppliers", icon: Truck, group: "Master data", allowed: (a) => a.canView },
  { key: "requisitions", to: "/store/requisitions", label: "Purchase Requisitions", icon: ClipboardList, group: "Purchasing", allowed: (a) => a.canView || a.request || a.create },
  { key: "purchase-orders", to: "/store/purchase-orders", label: "Purchase Orders", icon: ShoppingCart, group: "Purchasing", allowed: (a) => a.canView },
  { key: "receipts", to: "/store/receipts", label: "Goods Receipt (GRN)", icon: PackageCheck, group: "Purchasing", allowed: (a) => a.canView },
  { key: "stock", to: "/store/stock", label: "Stock Management", icon: PackageSearch, group: "Stock and distribution", allowed: (a) => a.canView },
  { key: "issues", to: "/store/issues", label: "Item Issue / Distribution", icon: ArrowLeftRight, group: "Stock and distribution", allowed: (a) => a.canView || a.request || a.issue },
  { key: "returns", to: "/store/returns", label: "Returns", icon: Undo2, group: "Stock and distribution", allowed: (a) => a.canView || a.returns },
  { key: "sales", to: "/store/sales", label: "Store Sales", icon: Receipt, group: "Sales and insight", allowed: (a) => a.canView || a.sell },
  { key: "reports", to: "/store/reports", label: "Reports", icon: BarChart3, group: "Sales and insight", allowed: (a) => a.reports },
];

function NotificationsBell() {
  const { t } = useTranslation("store");
  const navigate = useNavigate();
  const feed = useQuery({ queryKey: ["store", "notifications"], queryFn: () => listNotifications(false), refetchInterval: 60_000 });
  const readAll = useApiMutation(() => markNotificationsRead(), { invalidate: [["store", "notifications"]] });
  const unread = feed.data?.unread ?? 0;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="icon" className="relative" aria-label={unread ? t("Store alerts, {{count}} unread", { count: unread }) : t("Store alerts")}>
          <Bell className="h-4 w-4" />
          {unread > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-destructive px-1 text-[10px] leading-4 text-white">{unread > 99 ? "99+" : unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[90vw] p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <p className="text-sm font-semibold">{t("Store alerts")}</p>
          <Button variant="ghost" size="sm" disabled={unread === 0 || readAll.isPending} onClick={() => readAll.mutate(undefined)}>{t("Mark all read")}</Button>
        </div>
        <ul className="max-h-96 divide-y divide-border overflow-y-auto">
          {(feed.data?.items ?? []).length === 0 && <li className="px-3 py-6 text-center text-sm text-muted-foreground">{t("Nothing needs your attention.")}</li>}
          {(feed.data?.items ?? []).map((n) => (
            <li key={n.id}>
              <button type="button" className={cn("w-full px-3 py-2 text-left hover:bg-muted/60", !n.read && "bg-accent/40")} onClick={() => n.link && navigate(n.link)}>
                <div className="flex items-center gap-2">
                  <Badge variant={n.kind.includes("out-of") || n.kind === "payment-due" ? "danger" : n.kind === "low-stock" ? "warning" : "info"}>{t(NOTIFICATION_LABEL[n.kind] ?? "Store")}</Badge>
                  <span className="text-xs text-muted-foreground">{formatDateTime(n.at)}</span>
                </div>
                <p className="mt-1 text-sm font-medium">{n.title}</p>
                <p className="text-xs text-muted-foreground">{n.message}</p>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** How many things are waiting for someone, shown beside the menu entry that handles them. */
function useMenuBadges(enabled: boolean): Record<string, number> {
  const dashboard = useQuery({ queryKey: ["store", "menu-badges"], queryFn: () => getDashboard(), enabled, refetchInterval: 120_000, retry: false });
  const d = dashboard.data;
  return d ? { requisitions: d.pendingRequisitions, receipts: d.pendingReceipts, issues: d.pendingIssues, returns: d.pendingReturns, stock: d.lowStockItems + d.outOfStockItems } : {};
}

/**
 * The module's frame: a title and the alert bell, then a grouped side menu (a menu button on phones) built from what the signed-in user
 * may open and what the school has not hidden for their role. Entries carry icons and counts of what is waiting, and the current page is
 * announced to screen readers (aria-current).
 */
export default function StoreLayout() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const hidden = useSubMenuStore((s) => s.hidden);
  const [open, setOpen] = useState(false);
  const badges = useMenuBadges(access.canView);
  // What the school hides for this role in Roles & permissions → Sub-menus is a display choice on top of what they are allowed to do.
  const sections = SECTIONS.filter((s) => s.allowed(access) && !hidden.has(tabKey("store.home", s.key)));
  // A section the signed-in user has no entry for (typed into the address bar, or an old bookmark) goes to their first one.
  const current = SECTIONS.find((s) => (s.end ? pathname === s.to : pathname === s.to || pathname.startsWith(`${s.to}/`)));
  if (current && !sections.includes(current) && sections.length > 0) return <Navigate to={sections[0].to} replace />;
  const shown = sections.find((s) => s === current) ?? sections[0];
  const ShownIcon = shown?.icon;

  return (
    <PageContainer>
      <PageHeader title={t("Store Management")} description={t("Stock, purchasing, issues, sales and returns for every school store.")} icon={Store} actions={
          <div className="flex items-center gap-2">
            {access.sell && (
              <Button onClick={() => navigate("/store/sales?new=1")}>
                <Plus className="h-4 w-4" /> {t("New Sale")}
              </Button>
            )}
            <NotificationsBell />
          </div>
        }
      />
      <div className="grid gap-5 lg:grid-cols-[15.5rem_minmax(0,1fr)]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <button
            type="button"
            className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2.5 text-sm font-medium lg:hidden"
            aria-expanded={open}
            aria-controls="store-menu"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="flex items-center gap-2">
              {ShownIcon && <ShownIcon className="h-4 w-4 text-primary" aria-hidden="true" />}
              {shown ? t(shown.label) : t("Store menu")}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
          <nav id="store-menu" aria-label={t("Store sections")} className={cn("mt-2 space-y-4 rounded-xl border border-border bg-card p-2 lg:mt-0 lg:block", open ? "block" : "hidden")}>
            {GROUPS.map((group) => {
              const items = sections.filter((s) => s.group === group);
              if (items.length === 0) return null;
              return (
                <div key={group} role="group" aria-label={t(group)}>
                  <p className="px-2.5 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{t(group)}</p>
                  <ul className="space-y-0.5">
                    {items.map((s) => {
                      const count = badges[s.key] ?? 0;
                      return (
                        <li key={s.to}>
                          <NavLink
                            to={s.to}
                            end={s.end}
                            onClick={() => setOpen(false)}
                            className={({ isActive }) =>
                              cn(
                                "flex min-h-10 items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                                isActive ? "bg-accent text-accent-foreground" : "text-foreground/80 hover:bg-muted hover:text-foreground",
                              )
                            }
                          >
                            <s.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                            <span className="min-w-0 flex-1 truncate">{t(s.label)}</span>
                            {count > 0 && (
                              <span className="rounded-full bg-primary px-1.5 text-[11px] font-semibold leading-5 text-primary-foreground" aria-label={t("{{count}} waiting", { count })}>
                                {count > 99 ? "99+" : count}
                              </span>
                            )}
                          </NavLink>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </nav>
        </div>
        <div className="min-w-0 space-y-4">
          <Outlet />
        </div>
      </div>
    </PageContainer>
  );
}
