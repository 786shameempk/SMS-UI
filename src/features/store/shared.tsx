import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient, type QueryKey, type UseQueryResult } from "@tanstack/react-query";
import axios from "axios";
import toast from "react-hot-toast";
import { Plus, Printer, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Pagination } from "@/components/tables/Pagination";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import Letterhead from "@/features/tenant/Letterhead";
import { extractApiErrorMessage } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { listCategories, listItems, listStores } from "./api";
import type { Item, Page, Store } from "./types";

export const ALL = "__all";

export interface Option<T extends string = string> {
  value: T;
  label: string;
}

export const options = <T extends string>(labels: Record<T, string>): Option<T>[] => (Object.keys(labels) as T[]).map((value) => ({ value, label: labels[value] }));

// ── Access ──────────────────────────────────────────────────────────────────

export interface StoreAccess {
  canView: boolean;
  request: boolean;
  create: boolean;
  edit: boolean;
  remove: boolean;
  approve: boolean;
  reject: boolean;
  issue: boolean;
  receive: boolean;
  transfer: boolean;
  sell: boolean;
  returns: boolean;
  adjust: boolean;
  reports: boolean;
  export: boolean;
  /** Whether the module is shown at all (module.store). */
  hasModule: boolean;
}

const ACTIONS = {
  canView: "Store.View", request: "Store.Request", create: "Store.Create", edit: "Store.Edit", remove: "Store.Delete", approve: "Store.Approve", reject: "Store.Reject",
  issue: "Store.Issue", receive: "Store.Receive", transfer: "Store.Transfer", sell: "Store.Sell", returns: "Store.Return", adjust: "Store.Adjust", reports: "Store.Reports", export: "Store.Export",
} as const;

/**
 * What the signed-in user may do in the store, from the module flag and the Store.* actions in their session. A session from before staff
 * actions existed (no "Staff.Managed" marker) is judged by the module alone, as the server does. The server enforces all of this again.
 */
export function useStoreAccess(): StoreAccess {
  const permissions = useAuthStore((s) => s.modulePermissions);
  const role = useAuthStore((s) => s.user?.role);
  const hasModule = Boolean(permissions?.store);
  const family = role === "parent" || role === "student";
  const managed = Boolean(permissions?.["Staff.Managed"]);
  const can = (action: string) => hasModule && !family && (managed ? Boolean(permissions?.[action]) : true);
  return { hasModule: hasModule && !family, ...(Object.fromEntries(Object.entries(ACTIONS).map(([key, action]) => [key, can(action)])) as Omit<StoreAccess, "hasModule">) };
}

// ── Formatting ──────────────────────────────────────────────────────────────

const moneyFormat = new Intl.NumberFormat(undefined, { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const qtyFormat = new Intl.NumberFormat(undefined, { maximumFractionDigits: 3 });

export const money = (n?: number | null) => (n === undefined || n === null ? "—" : moneyFormat.format(n));
export const qty = (n?: number | null) => (n === undefined || n === null ? "—" : qtyFormat.format(n));
export const formatDate = (iso?: string | null) => (iso ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "—");
export const formatDateTime = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";
export const todayIso = () => new Date().toISOString().slice(0, 10);
export const toNumber = (v: string) => (v.trim() === "" || Number.isNaN(Number(v)) ? 0 : Number(v));
export const optional = (v: string) => (v.trim() === "" ? null : v.trim());

// ── Mutations ───────────────────────────────────────────────────────────────

export function toastApiError(error: unknown) {
  // The api layer has already turned the server's reply into an Error carrying its message, so show a plain Error as is.
  const message = error instanceof Error && !axios.isAxiosError(error) && error.message ? error.message : extractApiErrorMessage(error);
  toast.error(message, { id: `store-${message}` });
}

/** A mutation that refreshes the store's queries, says what happened, and reports a server refusal in plain words. */
export function useApiMutation<TVars, TResult>(fn: (vars: TVars) => Promise<TResult>, opts: { success?: string | ((r: TResult) => string); invalidate?: QueryKey[]; onSuccess?: (r: TResult) => void } = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (result) => {
      for (const key of opts.invalidate ?? [["store"]]) queryClient.invalidateQueries({ queryKey: key });
      const message = typeof opts.success === "function" ? opts.success(result) : opts.success;
      if (message) toast.success(message);
      opts.onSuccess?.(result);
    },
    onError: toastApiError,
  });
}

// ── Lookups ─────────────────────────────────────────────────────────────────

export function useStores(includeInactive = false) {
  return useQuery({ queryKey: ["store", "stores", includeInactive], queryFn: () => listStores(includeInactive), staleTime: 60_000 });
}

export function useStoreOptions(includeInactive = false) {
  const query = useStores(includeInactive);
  return { ...query, options: (query.data ?? []).map((s: Store) => ({ value: s.id, label: s.name })) as Option[] };
}

export function useCategories() {
  return useQuery({ queryKey: ["store", "categories"], queryFn: () => listCategories(true), staleTime: 60_000 });
}

/** Active items for pickers (the catalogue is small enough to filter in the browser). */
export function useItemCatalogue(storeId?: string) {
  return useQuery({
    queryKey: ["store", "item-catalogue", storeId ?? null],
    queryFn: async () => (await listItems({ active: true, storeId, pageNumber: 1, pageSize: 500 })).items,
    staleTime: 30_000,
  });
}

// ── Small controls ──────────────────────────────────────────────────────────

export function SelectField<T extends string>({
  id, value, onChange, items, placeholder, allLabel, disabled, className, invalid,
}: {
  id?: string;
  value: T | undefined | null;
  onChange: (value: T | undefined) => void;
  items: Option<T>[];
  placeholder?: string;
  /** Adds a leading "all" choice that clears the value (for filters). */
  allLabel?: string;
  disabled?: boolean;
  className?: string;
  invalid?: boolean;
}) {
  const { t } = useTranslation("store");
  return (
    <Select value={value ?? (allLabel ? ALL : undefined)} onValueChange={(v) => onChange(v === ALL ? undefined : (v as T))} disabled={disabled}>
      <SelectTrigger id={id} className={className} aria-invalid={invalid ? true : undefined}>
        <SelectValue placeholder={placeholder ?? t("Select")} />
      </SelectTrigger>
      <SelectContent>
        {allLabel && <SelectItem value={ALL}>{allLabel}</SelectItem>}
        {items.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {t(o.label)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function StoreSelect({ value, onChange, allLabel, id, includeInactive, disabled }: { value?: string; onChange: (v: string | undefined) => void; allLabel?: string; id?: string; includeInactive?: boolean; disabled?: boolean }) {
  const { options: stores } = useStoreOptions(includeInactive);
  return <SelectField id={id} value={value} onChange={onChange} items={stores} allLabel={allLabel} disabled={disabled} className="w-full" />;
}

export function itemOption(i: Item, showStock = false): ComboboxOption {
  return { value: i.id, label: i.name, hint: [i.sku, showStock && i.storeStock !== undefined && i.storeStock !== null ? `${qty(i.storeStock)} ${i.unit} here` : null].filter(Boolean).join(" · ") };
}

export function ItemPicker({ value, onChange, storeId, items, id, label }: { value: string; onChange: (itemId: string, item?: Item) => void; storeId?: string; items?: Item[]; id?: string; label?: string }) {
  const { t } = useTranslation("store");
  const catalogue = useItemCatalogue(storeId);
  const list = items ?? catalogue.data ?? [];
  return (
    <Combobox
      id={id}
      aria-label={label ?? t("Item")}
      value={value || null}
      onValueChange={(v) => onChange(v, list.find((i) => i.id === v))}
      options={list.map((i) => itemOption(i, Boolean(storeId)))}
      placeholder={t("Choose an item")}
      searchPlaceholder={t("Search by name or code")}
    />
  );
}

// ── Line items editor ───────────────────────────────────────────────────────

export interface EditableLine {
  key: string;
  itemId: string;
  quantity: string;
  price: string;
  discount: string;
  tax: string;
  note: string;
}

let lineSeed = 0;
export const newLine = (patch: Partial<EditableLine> = {}): EditableLine => ({ key: `line-${++lineSeed}`, itemId: "", quantity: "", price: "", discount: "", tax: "", note: "", ...patch });

/** A table of item lines. Turn columns on for what the document needs; typing a quantity above the stock in hand is flagged, not blocked (the server decides). */
export function LinesEditor({
  lines, onChange, storeId, showPrice, priceLabel, showDiscount, showTax, showNote, showStock, itemList, disabled, onItemPicked, minLines = 1,
}: {
  lines: EditableLine[];
  onChange: (lines: EditableLine[]) => void;
  storeId?: string;
  showPrice?: boolean;
  priceLabel?: string;
  showDiscount?: boolean;
  showTax?: boolean;
  showNote?: boolean;
  /** Warn when the quantity is more than the store holds. */
  showStock?: boolean;
  itemList?: Item[];
  disabled?: boolean;
  onItemPicked?: (line: EditableLine, item?: Item) => Partial<EditableLine>;
  minLines?: number;
}) {
  const { t } = useTranslation("store");
  const catalogue = useItemCatalogue(storeId);
  const list = itemList ?? catalogue.data ?? [];
  const set = (key: string, patch: Partial<EditableLine>) => onChange(lines.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  return (
    <div className="space-y-2">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-56">{t("Item")}</TableHead>
              <TableHead className="w-28">{t("Quantity")}</TableHead>
              {showPrice && <TableHead className="w-32">{priceLabel ?? t("Price")}</TableHead>}
              {showDiscount && <TableHead className="w-24">{t("Discount %")}</TableHead>}
              {showTax && <TableHead className="w-24">{t("Tax %")}</TableHead>}
              {showNote && <TableHead className="min-w-40">{t("Note")}</TableHead>}
              <TableHead className="w-10"><span className="sr-only">{t("Remove")}</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lines.map((l) => {
              const item = list.find((i) => i.id === l.itemId);
              const over = showStock && item && item.storeStock !== undefined && item.storeStock !== null && toNumber(l.quantity) > item.storeStock;
              return (
                <TableRow key={l.key} hover={false}>
                  <TableCell>
                    <ItemPicker value={l.itemId} storeId={storeId} items={list} onChange={(id, picked) => set(l.key, { itemId: id, ...(onItemPicked?.(l, picked) ?? {}) })} />
                    {item && <p className="mt-1 text-xs text-muted-foreground">{item.unit}{showStock && item.storeStock !== undefined && item.storeStock !== null ? ` · ${qty(item.storeStock)} ${t("in stock here")}` : ""}</p>}
                  </TableCell>
                  <TableCell>
                    <Input inputMode="decimal" aria-label={t("Quantity")} value={l.quantity} disabled={disabled} onChange={(e) => set(l.key, { quantity: e.target.value })} aria-invalid={over ? true : undefined} />
                    {over && <p className="mt-1 text-xs text-destructive-strong">{t("More than in stock")}</p>}
                  </TableCell>
                  {showPrice && <TableCell><Input inputMode="decimal" aria-label={priceLabel ?? t("Price")} value={l.price} disabled={disabled} onChange={(e) => set(l.key, { price: e.target.value })} /></TableCell>}
                  {showDiscount && <TableCell><Input inputMode="decimal" aria-label={t("Discount %")} value={l.discount} disabled={disabled} onChange={(e) => set(l.key, { discount: e.target.value })} /></TableCell>}
                  {showTax && <TableCell><Input inputMode="decimal" aria-label={t("Tax %")} value={l.tax} disabled={disabled} onChange={(e) => set(l.key, { tax: e.target.value })} /></TableCell>}
                  {showNote && <TableCell><Input aria-label={t("Note")} value={l.note} disabled={disabled} onChange={(e) => set(l.key, { note: e.target.value })} /></TableCell>}
                  <TableCell>
                    <Button type="button" variant="ghost" size="icon" aria-label={t("Remove line")} disabled={disabled || lines.length <= minLines} onClick={() => onChange(lines.filter((x) => x.key !== l.key))}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onChange([...lines, newLine()])}>
        <Plus className="h-4 w-4" /> {t("Add item")}
      </Button>
    </div>
  );
}

// ── Paged table ─────────────────────────────────────────────────────────────

export interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
  align?: "right";
}

/** A server-paged table in a card: loading skeleton, error with retry, empty state, and the page footer. */
export function PagedTable<T>({
  query, columns, rowKey, onRowClick, pageIndex, onPageChange, pageSize, emptyTitle, emptyDescription, emptyAction,
}: {
  query: UseQueryResult<Page<T>>;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  pageIndex: number;
  onPageChange: (index: number) => void;
  pageSize: number;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: ReactNode;
}) {
  const { t } = useTranslation("store");
  if (query.isError) return <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />;
  if (query.isLoading) return <Card className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9 w-full" />)}</Card>;
  const data = query.data;
  if (!data || data.items.length === 0) return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />;
  const pageCount = Math.max(1, Math.ceil(data.totalCount / pageSize));
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c.header} className={cn(c.align === "right" && "text-right", c.className)}>{t(c.header)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((row) => (
              <TableRow
                key={rowKey(row)}
                className={onRowClick ? "cursor-pointer" : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === "Enter") onRowClick(row); } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
              >
                {columns.map((c) => (
                  <TableCell key={c.header} className={cn(c.align === "right" && "text-right tabular-nums", c.className)}>{c.cell(row)}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="border-t border-border px-3 py-2">
        <Pagination
          pageIndex={pageIndex}
          pageCount={pageCount}
          pageSize={pageSize}
          totalCount={data.totalCount}
          from={pageIndex * pageSize + 1}
          to={Math.min((pageIndex + 1) * pageSize, data.totalCount)}
          onPageChange={onPageChange}
        />
      </div>
    </Card>
  );
}

/** Page index state that returns to the first page whenever a filter changes. */
export function usePageState(size = 15) {
  const [pageIndex, setPageIndex] = useState(0);
  return { pageIndex, setPageIndex, pageSize: size, pageNumber: pageIndex + 1, reset: () => setPageIndex(0) };
}

// ── Printing ────────────────────────────────────────────────────────────────

const PRINT_STYLE = `
  @media print {
    body * { visibility: hidden; }
    #store-print, #store-print * { visibility: visible; }
    #store-print { position: absolute; top: 0; left: 0; width: 100%; border: 0 !important; box-shadow: none !important; }
    .store-no-print { display: none !important; }
  }
`;

/** A document (order, receipt, issue slip) in a dialog with a Print button and the school's letterhead. */
export function PrintableDialog({ open, onOpenChange, title, children, actions, wide }: { open: boolean; onOpenChange: (open: boolean) => void; title: string; children: ReactNode; actions?: ReactNode; wide?: boolean }) {
  const { t } = useTranslation("store");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={wide ? "max-w-3xl" : "max-w-xl"}>
        <DialogHeader className="store-no-print flex-row items-center justify-between gap-2 space-y-0 pr-8">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">{title}</DialogDescription>
          <Button size="sm" variant="outline" onClick={() => window.print()}>
            <Printer className="h-3.5 w-3.5" /> {t("Print")}
          </Button>
        </DialogHeader>
        <style>{PRINT_STYLE}</style>
        <div id="store-print" className="space-y-4 rounded-xl border border-border bg-white p-5 text-slate-900">
          <div className="border-b border-border pb-3"><Letterhead /></div>
          {children}
        </div>
        {actions && <div className="store-no-print flex flex-wrap justify-end gap-2">{actions}</div>}
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium break-words">{children ?? "—"}</dd>
    </div>
  );
}

export function SummaryGrid({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{children}</dl>;
}

/** Downloads a report or table as CSV (opens in Excel) or opens it for printing/Save as PDF. */
export function openPrintWindow(title: string, headers: string[], rows: unknown[][], totalsLine?: string): boolean {
  const win = window.open("", "_blank");
  if (!win) return false;
  const esc = (v: unknown) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
  win.document.write(
    `<!doctype html><title>${esc(title)}</title><style>body{font:12px system-ui,sans-serif;margin:24px}h1{font-size:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f3f4f6}</style><h1>${esc(title)}</h1><p>${esc(new Date().toLocaleString())}</p><table><thead><tr>${headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>${totalsLine ? `<p><b>${esc(totalsLine)}</b></p>` : ""}<script>window.onload=()=>window.print()</script>`,
  );
  win.document.close();
  return true;
}
