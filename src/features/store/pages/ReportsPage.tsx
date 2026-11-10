import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ExportMenu } from "@/components/ui/export-menu";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pagination } from "@/components/tables/Pagination";
import { downloadCsv, fileSafe } from "@/utils/csv";
import { listAudit, listReports, getSupplierOptions, runReport } from "../api";
import { MOVEMENT_LABEL } from "../constants";
import { PagedTable, SelectField, StoreSelect, formatDateTime, money, openPrintWindow, qty, useCategories, usePageState, useStoreAccess } from "../shared";
import type { ReportColumn, ReportFilters, ReportInfo } from "../types";

const KIND_FILTERS: Record<string, { label: string; items: { value: string; label: string }[] } | undefined> = {
  "stock-movement": { label: "Movement", items: Object.entries(MOVEMENT_LABEL).map(([value, label]) => ({ value, label })) },
  "issue-register": { label: "Recipient type", items: ["Student", "Teacher", "Staff", "Department", "Class", "Laboratory", "Facility", "Other"].map((v) => ({ value: v, label: v })) },
  "sales-register": { label: "Payment status", items: ["Unpaid", "Partial", "Paid"].map((v) => ({ value: v, label: v })) },
  "sales-collection": { label: "Method", items: ["Cash", "Online", "Card", "Cheque", "BankTransfer", "Other"].map((v) => ({ value: v, label: v })) },
};
const SUPPLIER_REPORTS = ["purchase-register", "supplier-purchases", "item-purchase-history"];
const NO_STORE = ["low-stock", "out-of-stock"];
const DATED = ["stock-movement", "damaged-expired", "stock-adjustment", "store-transfer", "purchase-register", "supplier-purchases", "item-purchase-history", "issue-register", "student-issues", "staff-issues", "department-consumption", "sales-register", "sales-collection"];

const cell = (value: unknown, column: ReportColumn): string => {
  if (value === null || value === undefined || value === "") return "—";
  if (column.type === "money") return money(Number(value));
  if (column.type === "number") return qty(Number(value));
  return String(value);
};

function ReportView({ info }: { info: ReportInfo }) {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const categories = useCategories();
  const suppliers = useQuery({ queryKey: ["store", "suppliers", "pick"], queryFn: getSupplierOptions, enabled: SUPPLIER_REPORTS.includes(info.key), staleTime: 60_000 });
  const [filters, setFilters] = useState<ReportFilters>({});
  const [exporting, setExporting] = useState(false);
  const paging = usePageState(25);
  const set = (patch: ReportFilters) => { setFilters((f) => ({ ...f, ...patch })); paging.reset(); };
  const query = useQuery({ queryKey: ["store", "report", info.key, filters, paging.pageNumber], queryFn: () => runReport(info.key, { ...filters, pageNumber: paging.pageNumber, pageSize: paging.pageSize }), placeholderData: (p) => p });
  const data = query.data;
  const kindFilter = KIND_FILTERS[info.key];

  const everything = async () => runReport(info.key, { ...filters, pageNumber: 1, pageSize: 5000 });
  const asRows = (r: NonNullable<typeof data>) => r.rows.map((row) => row.map((v, i) => (r.columns[i].type === "text" || r.columns[i].type === "date" ? (v ?? "") : v)));
  const exportCsv = async () => {
    setExporting(true);
    try { const r = await everything(); downloadCsv(fileSafe(info.title), r.columns.map((c) => c.label), asRows(r)); } catch { toast.error(t("The export could not be prepared.")); } finally { setExporting(false); }
  };
  const exportPdf = () => {
    // The window must open from the click itself, so it opens first and fills in once the rows arrive.
    const win = window.open("", "_blank");
    if (!win) return false;
    win.document.write(`<p>${t("Preparing…")}</p>`);
    void everything().then((r) => {
      const esc = (v: unknown) => String(v ?? "").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);
      const totals = Object.entries(r.totals).map(([k, v]) => `${k}: ${v}`).join("  ");
      win.document.open();
      win.document.write(`<!doctype html><title>${esc(info.title)}</title><style>body{font:12px system-ui,sans-serif;margin:24px}h1{font-size:16px}table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:4px 6px;text-align:left}th{background:#f3f4f6}</style><h1>${esc(info.title)}</h1><p>${esc(new Date().toLocaleString())} · ${r.totalCount} rows</p><table><thead><tr>${r.columns.map((c) => `<th>${esc(c.label)}</th>`).join("")}</tr></thead><tbody>${r.rows.map((row) => `<tr>${row.map((v, i) => `<td>${esc(cell(v, r.columns[i]))}</td>`).join("")}</tr>`).join("")}</tbody></table>${totals ? `<p><b>${esc(totals)}</b></p>` : ""}<script>window.onload=()=>window.print()</script>`);
      win.document.close();
    }).catch(() => { win.close(); toast.error(t("The export could not be prepared.")); });
    return true;
  };

  const pageCount = data ? Math.max(1, Math.ceil(data.totalCount / paging.pageSize)) : 1;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        {DATED.includes(info.key) && (
          <>
            <div className="w-40"><span className="mb-1 block text-xs text-muted-foreground">{t("From")}</span><Input type="date" aria-label={t("From")} value={filters.from ?? ""} max={filters.to || undefined} onChange={(e) => set({ from: e.target.value || undefined })} /></div>
            <div className="w-40"><span className="mb-1 block text-xs text-muted-foreground">{t("To")}</span><Input type="date" aria-label={t("To")} value={filters.to ?? ""} min={filters.from || undefined} onChange={(e) => set({ to: e.target.value || undefined })} /></div>
          </>
        )}
        {!NO_STORE.includes(info.key) && <div className="w-48"><span className="mb-1 block text-xs text-muted-foreground">{t("Store")}</span><StoreSelect value={filters.storeId} onChange={(v) => set({ storeId: v })} allLabel={t("All stores")} /></div>}
        {!["supplier-purchases", "student-issues", "staff-issues", "department-consumption", "sales-collection", "store-transfer"].includes(info.key) && (
          <div className="w-48"><span className="mb-1 block text-xs text-muted-foreground">{t("Category")}</span><SelectField value={filters.categoryId} onChange={(v) => set({ categoryId: v })} allLabel={t("All categories")} items={(categories.data ?? []).map((c) => ({ value: c.id, label: c.parentName ? `${c.parentName} / ${c.name}` : c.name }))} /></div>
        )}
        {SUPPLIER_REPORTS.includes(info.key) && <div className="w-48"><span className="mb-1 block text-xs text-muted-foreground">{t("Supplier")}</span><SelectField value={filters.supplierId} onChange={(v) => set({ supplierId: v })} allLabel={t("All suppliers")} items={(suppliers.data ?? []).map((s) => ({ value: s.id, label: s.name }))} /></div>}
        {kindFilter && <div className="w-48"><span className="mb-1 block text-xs text-muted-foreground">{t(kindFilter.label)}</span><SelectField value={filters.kind} onChange={(v) => set({ kind: v })} allLabel={t("Any")} items={kindFilter.items} /></div>}
        <div className="min-w-48 flex-1"><SearchInput value={filters.search ?? ""} onValueChange={(v) => set({ search: v || undefined })} placeholder={t("Search")} aria-label={t("Search the report")} /></div>
        {Object.values(filters).some(Boolean) && <Button variant="ghost" onClick={() => { setFilters({}); paging.reset(); }}>{t("Clear")}</Button>}
        <div className="ml-auto flex gap-2">
          {access.export ? <ExportMenu onCsv={() => void exportCsv()} onPdf={exportPdf} disabled={!data || data.totalCount === 0 || exporting} /> : <p className="self-center text-xs text-muted-foreground">{t("Exporting needs permission to export reports.")}</p>}
          <Button variant="outline" size="sm" disabled={!data || data.rows.length === 0} onClick={() => data && openPrintWindow(info.title, data.columns.map((c) => c.label), data.rows.map((r) => r.map((v, i) => cell(v, data.columns[i]))), Object.entries(data.totals).map(([k, v]) => `${k}: ${v}`).join("  "))}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-3.5 w-3.5" />} {t("Print this page")}
          </Button>
        </div>
      </div>

      {query.isError && <ErrorState onRetry={() => query.refetch()} retrying={query.isFetching} />}
      {query.isLoading && <Card className="space-y-2 p-4">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-8 w-full" />)}</Card>}
      {data && data.rows.length === 0 && <EmptyState title={t("Nothing to report")} description={t("No records match these filters.")} />}
      {data && data.rows.length > 0 && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>{data.columns.map((c) => <TableHead key={c.key} className={c.type === "number" || c.type === "money" ? "text-right" : undefined}>{t(c.label)}</TableHead>)}</TableRow></TableHeader>
              <TableBody>
                {data.rows.map((row, r) => (
                  <TableRow key={r}>{row.map((v, i) => <TableCell key={data.columns[i].key} className={data.columns[i].type === "number" || data.columns[i].type === "money" ? "text-right tabular-nums" : undefined}>{cell(v, data.columns[i])}</TableCell>)}</TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {Object.keys(data.totals).length > 0 && (
            <div className="flex flex-wrap gap-4 border-t border-border bg-muted/30 px-4 py-2 text-sm font-medium">
              {Object.entries(data.totals).map(([k, v]) => <span key={k}>{t("Total")} {k}: <span className="tabular-nums">{data.columns.find((c) => c.key === k)?.type === "money" ? money(v) : qty(v)}</span></span>)}
              <span className="ml-auto text-muted-foreground">{t("{{count}} rows", { count: data.totalCount })}</span>
            </div>
          )}
          <div className="border-t border-border px-3 py-2">
            <Pagination pageIndex={paging.pageIndex} pageCount={pageCount} pageSize={paging.pageSize} totalCount={data.totalCount} from={paging.pageIndex * paging.pageSize + 1} to={Math.min((paging.pageIndex + 1) * paging.pageSize, data.totalCount)} onPageChange={paging.setPageIndex} />
          </div>
        </Card>
      )}
    </div>
  );
}

function AuditView() {
  const { t } = useTranslation("store");
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState<string | undefined>();
  const paging = usePageState(25);
  const f = { search: search.trim() || undefined, entityType, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const query = useQuery({ queryKey: ["store", "audit", f], queryFn: () => listAudit(f), placeholderData: (p) => p });
  const types = ["Store", "Category", "Item", "Supplier", "Requisition", "PurchaseOrder", "GoodsReceipt", "SupplierInvoice", "Issue", "Sale", "Return", "Adjustment", "Transfer", "StockCount", "Settings"];
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("A permanent record of who changed what. Entries cannot be edited or deleted.")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={(v) => { setSearch(v); paging.reset(); }} placeholder={t("Search by document, action, person or note")} aria-label={t("Search the audit log")} /></div>
        <div className="w-52"><SelectField value={entityType} onChange={(v) => { setEntityType(v); paging.reset(); }} allLabel={t("All records")} items={types.map((x) => ({ value: x, label: x }))} /></div>
      </div>
      <PagedTable query={query} rowKey={(a) => a.id} pageIndex={paging.pageIndex} onPageChange={paging.setPageIndex} pageSize={paging.pageSize} emptyTitle={t("No audit entries")}
        columns={[
          { header: "When", cell: (a) => formatDateTime(a.at) },
          { header: "Record", cell: (a) => <div><p className="font-medium">{a.reference ?? "—"}</p><p className="text-xs text-muted-foreground">{a.entityType}</p></div> },
          { header: "Action", cell: (a) => a.action },
          { header: "Details", className: "max-w-96", cell: (a) => a.summary ?? "—" },
          { header: "By", cell: (a) => a.by ?? "—" },
        ]} />
    </div>
  );
}

export default function ReportsPage() {
  const { t } = useTranslation("store");
  const catalogue = useQuery({ queryKey: ["store", "report-catalogue"], queryFn: listReports, staleTime: 5 * 60_000 });
  const [view, setView] = useState<string>("current-stock");
  const groups = useMemo(() => {
    const map = new Map<string, ReportInfo[]>();
    for (const r of catalogue.data ?? []) map.set(r.group, [...(map.get(r.group) ?? []), r]);
    return [...map.entries()];
  }, [catalogue.data]);
  const info = (catalogue.data ?? []).find((r) => r.key === view);

  if (catalogue.isError) return <ErrorState onRetry={() => catalogue.refetch()} retrying={catalogue.isFetching} />;
  if (catalogue.isLoading) return <Skeleton className="h-64 w-full" />;
  return (
    <div className="grid gap-4 lg:grid-cols-[16rem_1fr]">
      <nav aria-label={t("Reports")} className="space-y-3">
        {groups.map(([group, items]) => (
          <div key={group}>
            <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t(group)}</p>
            {items.map((r) => <button key={r.key} type="button" onClick={() => setView(r.key)} aria-current={view === r.key ? "page" : undefined} className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${view === r.key ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted"}`}>{r.title}</button>)}
          </div>
        ))}
        <button type="button" onClick={() => setView("audit")} aria-current={view === "audit" ? "page" : undefined} className={`block w-full rounded-md px-2 py-1.5 text-left text-sm ${view === "audit" ? "bg-accent font-medium text-accent-foreground" : "hover:bg-muted"}`}>{t("Audit trail")}</button>
      </nav>
      <div className="min-w-0 space-y-3">
        <div><h2 className="text-lg font-semibold">{view === "audit" ? t("Audit trail") : info?.title}</h2>{info && view !== "audit" && <p className="text-sm text-muted-foreground">{info.description}</p>}</div>
        {view === "audit" ? <AuditView /> : info && <ReportView key={info.key} info={info} />}
      </div>
    </div>
  );
}
