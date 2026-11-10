import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, ClipboardCheck, Plus, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cancelCount, createAdjustment, createTransfer, getCount, listAdjustments, listCounts, listLedger, listStockLevels, listTransfers, reconcileCount, saveCount, startCount } from "../api";
import FormDialog from "../components/FormDialog";
import { ADJUSTMENT_LABEL, ADJUSTMENT_SIGN, COUNT_STATUS_LABEL, MOVEMENT_LABEL } from "../constants";
import {
  Field, LinesEditor, PagedTable, PrintableDialog, SelectField, StoreSelect, SummaryGrid, formatDate, formatDateTime, money, newLine, options, qty, toNumber, useApiMutation, useCategories, usePageState, useStoreAccess,
  type EditableLine,
} from "../shared";
import type { AdjustmentReason, MovementType, StockCount } from "../types";

type View = "levels" | "ledger" | "adjustments" | "transfers" | "counts";

function Levels() {
  const { t } = useTranslation("store");
  const categories = useCategories();
  const [storeId, setStoreId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [search, setSearch] = useState("");
  const paging = usePageState(20);
  const f = { storeId, categoryId, status, search: search.trim() || undefined, includeZero: status === "out", pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const query = useQuery({ queryKey: ["store", "levels", f], queryFn: () => listStockLevels(f), placeholderData: (p) => p });
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); paging.reset(); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={reset(setSearch)} placeholder={t("Search by item name, code or barcode")} aria-label={t("Search stock")} /></div>
        <div className="w-48"><StoreSelect value={storeId} onChange={reset(setStoreId)} allLabel={t("All stores")} /></div>
        <div className="w-48"><SelectField value={categoryId} onChange={reset(setCategoryId)} allLabel={t("All categories")} items={(categories.data ?? []).map((c) => ({ value: c.id, label: c.parentName ? `${c.parentName} / ${c.name}` : c.name }))} /></div>
        <div className="w-40"><SelectField value={status} onChange={reset(setStatus)} allLabel={t("Any level")} items={[{ value: "ok", label: "In stock" }, { value: "low", label: "Low stock" }, { value: "out", label: "Out of stock" }]} /></div>
      </div>
      <PagedTable
        query={query}
        rowKey={(l) => `${l.storeId}:${l.itemId}`}
        pageIndex={paging.pageIndex}
        onPageChange={paging.setPageIndex}
        pageSize={paging.pageSize}
        emptyTitle={t("No stock to show")}
        emptyDescription={t("Stock appears here once goods are received or opening stock is entered.")}
        columns={[
          { header: "Item", cell: (l) => <div><p className="font-medium">{l.itemName}</p><p className="text-xs text-muted-foreground">{l.sku}</p></div> },
          { header: "Store", cell: (l) => l.storeName },
          { header: "Category", cell: (l) => l.category ?? "—" },
          { header: "Quantity", align: "right", cell: (l) => `${qty(l.quantity)} ${l.unit}` },
          { header: "Average cost", align: "right", cell: (l) => money(l.averageCost) },
          { header: "Value", align: "right", cell: (l) => money(l.value) },
          { header: "Minimum", align: "right", cell: (l) => qty(l.minStock) },
          { header: "Level", cell: (l) => <StatusBadge status={l.status === "Low stock" ? "lowstock" : l.status === "Out of stock" ? "outofstock" : "available"} label={t(l.status)} /> },
        ]}
      />
    </div>
  );
}

function Ledger() {
  const { t } = useTranslation("store");
  const [storeId, setStoreId] = useState<string | undefined>();
  const [type, setType] = useState<MovementType | undefined>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reference, setReference] = useState("");
  const paging = usePageState(20);
  const f = { storeId, type, from: from || undefined, to: to || undefined, reference: reference.trim() || undefined, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const query = useQuery({ queryKey: ["store", "ledger", f], queryFn: () => listLedger(f), placeholderData: (p) => p });
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); paging.reset(); };
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{t("Every change to stock is recorded here and can never be edited or removed. Corrections are new lines.")}</p>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-48 flex-1"><SearchInput value={reference} onValueChange={reset(setReference)} placeholder={t("Document number, such as PO-2026-00001")} aria-label={t("Search by document number")} /></div>
        <div className="w-44"><StoreSelect value={storeId} onChange={reset(setStoreId)} allLabel={t("All stores")} /></div>
        <div className="w-48"><SelectField value={type} onChange={reset(setType)} allLabel={t("Any movement")} items={options(MOVEMENT_LABEL)} /></div>
        <div className="w-40"><Input type="date" aria-label={t("From")} value={from} onChange={(e) => reset(setFrom)(e.target.value)} /></div>
        <div className="w-40"><Input type="date" aria-label={t("To")} value={to} min={from || undefined} onChange={(e) => reset(setTo)(e.target.value)} /></div>
      </div>
      <PagedTable
        query={query}
        rowKey={(l) => l.id}
        pageIndex={paging.pageIndex}
        onPageChange={paging.setPageIndex}
        pageSize={paging.pageSize}
        emptyTitle={t("No stock movements")}
        columns={[
          { header: "When", cell: (l) => formatDateTime(l.at) },
          { header: "Document", cell: (l) => <span className="font-medium">{l.reference}</span> },
          { header: "Item", cell: (l) => <div><p>{l.itemName}</p><p className="text-xs text-muted-foreground">{l.sku}</p></div> },
          { header: "Store", cell: (l) => l.storeName },
          { header: "Movement", cell: (l) => <Badge variant={l.quantityChange < 0 ? "warning" : "info"}>{t(MOVEMENT_LABEL[l.type])}</Badge> },
          { header: "Change", align: "right", cell: (l) => <span className={l.quantityChange < 0 ? "text-destructive-strong" : "text-success-strong"}>{l.quantityChange > 0 ? "+" : ""}{qty(l.quantityChange)}</span> },
          { header: "Balance", align: "right", cell: (l) => qty(l.balanceAfter) },
          { header: "Unit cost", align: "right", cell: (l) => money(l.unitCost) },
          { header: "Reason", className: "max-w-64 truncate", cell: (l) => l.reason ?? "—" },
          { header: "By", cell: (l) => l.by ?? "—" },
        ]}
      />
    </div>
  );
}

function AdjustmentForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation("store");
  const [storeId, setStoreId] = useState<string | undefined>();
  const [reason, setReason] = useState<AdjustmentReason>("Inward");
  const [sign, setSign] = useState<"1" | "-1">("1");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);
  const [seeded, setSeeded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (open !== seeded) { setSeeded(open); if (open) { setStoreId(undefined); setReason("Inward"); setSign("1"); setRemarks(""); setLines([newLine()]); setErrors({}); } }
  const fixed = ADJUSTMENT_SIGN[reason];
  const direction = fixed ?? (sign === "1" ? 1 : -1);
  const showCost = direction === 1;
  const save = useApiMutation(
    () => createAdjustment({ storeId: storeId!, reason, remarks: remarks.trim(), lines: lines.map((l) => ({ itemId: l.itemId, quantityChange: direction * toNumber(l.quantity), unitCost: showCost && l.price.trim() !== "" ? toNumber(l.price) : null })) }),
    { success: "Stock adjusted", invalidate: [["store"]], onSuccess: () => onOpenChange(false) },
  );
  const submit = () => {
    const next: Record<string, string> = {};
    if (!storeId) next.store = t("Choose the store");
    if (remarks.trim().length < 3) next.remarks = t("A reason is required for every adjustment");
    if (lines.some((l) => !l.itemId || toNumber(l.quantity) <= 0)) next.lines = t("Every line needs an item and a quantity above zero");
    else if (new Set(lines.map((l) => l.itemId)).size !== lines.length) next.lines = t("An item appears more than once");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(undefined);
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t("Adjust stock")} description={t("Opening stock, inward and outward entries, corrections, and damaged, expired or lost stock.")} submitLabel={t("Record adjustment")} submitting={save.isPending} onSubmit={submit} size="xl">
      <div className="grid gap-4 md:grid-cols-3">
        <FormField label={t("Store")} required error={errors.store}><StoreSelect value={storeId} onChange={setStoreId} /></FormField>
        <FormField label={t("Type")}><SelectField value={reason} onChange={(v) => setReason(v ?? "Inward")} items={options(ADJUSTMENT_LABEL)} /></FormField>
        {fixed === null && <FormField label={t("Direction")}><SelectField value={sign} onChange={(v) => setSign(v ?? "1")} items={[{ value: "1", label: "Increase stock" }, { value: "-1", label: "Decrease stock" }]} /></FormField>}
        <FormField label={t("Reason (required)")} htmlFor="adj-remarks" required error={errors.remarks} className="md:col-span-3"><Textarea id="adj-remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={t("What happened, and how it was found")} /></FormField>
      </div>
      <LinesEditor lines={lines} onChange={setLines} storeId={storeId} showStock={direction === -1} showPrice={showCost} priceLabel={t("Unit cost (optional)")} />
      {errors.lines && <p role="alert" className="text-xs text-destructive-strong">{errors.lines}</p>}
    </FormDialog>
  );
}

function TransferForm({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { t } = useTranslation("store");
  const [from, setFrom] = useState<string | undefined>();
  const [to, setTo] = useState<string | undefined>();
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);
  const [seeded, setSeeded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  if (open !== seeded) { setSeeded(open); if (open) { setFrom(undefined); setTo(undefined); setNotes(""); setLines([newLine()]); setErrors({}); } }
  const save = useApiMutation(() => createTransfer({ fromStoreId: from!, toStoreId: to!, notes: notes.trim() || null, lines: lines.map((l) => ({ itemId: l.itemId, quantity: toNumber(l.quantity) })) }),
    { success: "Stock transferred", invalidate: [["store"]], onSuccess: () => onOpenChange(false) });
  const submit = () => {
    const next: Record<string, string> = {};
    if (!from) next.from = t("Choose where the stock is coming from");
    if (!to) next.to = t("Choose where it is going");
    else if (to === from) next.to = t("Choose a different store");
    if (lines.some((l) => !l.itemId || toNumber(l.quantity) <= 0)) next.lines = t("Every line needs an item and a quantity above zero");
    else if (new Set(lines.map((l) => l.itemId)).size !== lines.length) next.lines = t("An item appears more than once");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(undefined);
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t("Transfer stock between stores")} submitLabel={t("Transfer")} submitting={save.isPending} onSubmit={submit} size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("From store")} required error={errors.from}><StoreSelect value={from} onChange={setFrom} /></FormField>
        <FormField label={t("To store")} required error={errors.to}><StoreSelect value={to} onChange={setTo} /></FormField>
      </div>
      <LinesEditor lines={lines} onChange={setLines} storeId={from} showStock />
      {errors.lines && <p role="alert" className="text-xs text-destructive-strong">{errors.lines}</p>}
      <FormField label={t("Notes")} htmlFor="trf-notes" optional><Input id="trf-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
    </FormDialog>
  );
}

function CountDialog({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const query = useQuery({ queryKey: ["store", "count", id], queryFn: () => getCount(id!), enabled: id !== null });
  const [counted, setCounted] = useState<Record<string, string>>({});
  const [remarks, setRemarks] = useState("");
  const [seeded, setSeeded] = useState<string | null>(null);
  const c: StockCount | undefined = query.data;
  if (c && c.id !== seeded) {
    setSeeded(c.id);
    setCounted(Object.fromEntries(c.lines.map((l) => [l.id, l.countedQuantity == null ? "" : String(l.countedQuantity)])));
    setRemarks(c.remarks ?? "");
  }
  const payload = () => (c?.lines ?? []).map((l) => ({ lineId: l.id, countedQuantity: (counted[l.id] ?? "").trim() === "" ? null : toNumber(counted[l.id]), note: l.note ?? null }));
  const done = { invalidate: [["store"]] as string[][], onSuccess: () => undefined };
  const save = useApiMutation(() => saveCount(c!.id, payload()), { ...done, success: "Counts saved" });
  const reconcile = useApiMutation(async () => { await saveCount(c!.id, payload()); return reconcileCount(c!.id, remarks.trim() || undefined); }, { ...done, success: "Count reconciled and stock adjusted", onSuccess: onClose });
  const cancel = useApiMutation(() => cancelCount(c!.id), { ...done, success: "Count cancelled", onSuccess: onClose });
  const open = c?.status === "Open";
  const variance = (c?.lines ?? []).filter((l) => (counted[l.id] ?? "").trim() !== "" && toNumber(counted[l.id]) !== l.systemQuantity).length;
  return (
    <PrintableDialog
      open={id !== null}
      onOpenChange={(v) => !v && onClose()}
      title={c ? t("Stock count {{ref}}", { ref: c.reference }) : ""}
      wide
      actions={c && open && access.adjust && (
        <>
          <Button variant="ghost" onClick={() => cancel.mutate(undefined)} disabled={cancel.isPending}>{t("Cancel count")}</Button>
          <Button variant="outline" onClick={() => save.mutate(undefined)} disabled={save.isPending}>{t("Save counts")}</Button>
          <Button onClick={() => reconcile.mutate(undefined)} disabled={reconcile.isPending || (variance > 0 && !remarks.trim())}>{t("Reconcile {{n}} difference(s)", { n: variance })}</Button>
        </>
      )}
    >
      {c && (
        <>
          <SummaryGrid>
            <Field label={t("Store")}>{c.storeName}</Field>
            <Field label={t("Date")}>{formatDate(c.countDate)}</Field>
            <Field label={t("Status")}><StatusBadge status={c.status} label={t(COUNT_STATUS_LABEL[c.status])} /></Field>
          </SummaryGrid>
          <div className="overflow-x-auto"><table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1">{t("Item")}</th><th className="py-1 text-right">{t("System")}</th><th className="w-32 py-1">{t("Counted")}</th><th className="py-1 text-right">{t("Difference")}</th></tr></thead>
            <tbody>{c.lines.map((l) => {
              const value = (counted[l.id] ?? "").trim();
              const diff = value === "" ? null : toNumber(value) - l.systemQuantity;
              return (
                <tr key={l.id} className="border-b">
                  <td className="py-1">{l.itemName} <span className="text-xs text-muted-foreground">{l.sku}</span></td>
                  <td className="py-1 text-right tabular-nums">{qty(l.systemQuantity)} {l.unit}</td>
                  <td className="py-1">{open ? <Input inputMode="decimal" aria-label={t("Counted: {{name}}", { name: l.itemName })} value={counted[l.id] ?? ""} onChange={(e) => setCounted({ ...counted, [l.id]: e.target.value })} /> : qty(l.countedQuantity)}</td>
                  <td className={`py-1 text-right tabular-nums ${diff ? (diff < 0 ? "text-destructive-strong" : "text-success-strong") : ""}`}>{open ? (diff === null ? "—" : `${diff > 0 ? "+" : ""}${qty(diff)}`) : qty(l.variance)}</td>
                </tr>
              );
            })}</tbody>
          </table></div>
          {open && access.adjust && <div className="store-no-print"><FormField label={t("Explanation of differences")} htmlFor="count-remarks" hint={t("Required when counts differ from the system")}><Textarea id="count-remarks" rows={2} value={remarks} onChange={(e) => setRemarks(e.target.value)} /></FormField></div>}
          {!open && c.remarks && <p className="text-sm text-muted-foreground">{c.remarks}</p>}
        </>
      )}
    </PrintableDialog>
  );
}

function StartCountForm({ open, onOpenChange, onStarted }: { open: boolean; onOpenChange: (v: boolean) => void; onStarted: (id: string) => void }) {
  const { t } = useTranslation("store");
  const categories = useCategories();
  const [storeId, setStoreId] = useState<string | undefined>();
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [seeded, setSeeded] = useState(false);
  if (open !== seeded) { setSeeded(open); if (open) { setStoreId(undefined); setCategoryId(undefined); setRemarks(""); setError(""); } }
  const save = useApiMutation(() => startCount({ storeId: storeId!, categoryId, remarks: remarks.trim() || undefined }), { success: "Count started", invalidate: [["store", "counts"]], onSuccess: (c) => { onOpenChange(false); onStarted(c.id); } });
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t("Start a physical count")} description={t("Takes a snapshot of what the system holds so you can enter what is on the shelves.")} submitLabel={t("Start count")} submitting={save.isPending} onSubmit={() => (storeId ? save.mutate(undefined) : setError(t("Choose the store to count")))}>
      <FormField label={t("Store")} required error={error}><StoreSelect value={storeId} onChange={setStoreId} /></FormField>
      <FormField label={t("Only this category")} optional><SelectField value={categoryId} onChange={setCategoryId} allLabel={t("Everything in the store")} items={(categories.data ?? []).map((c) => ({ value: c.id, label: c.parentName ? `${c.parentName} / ${c.name}` : c.name }))} /></FormField>
      <FormField label={t("Notes")} htmlFor="cnt-remarks" optional><Input id="cnt-remarks" value={remarks} onChange={(e) => setRemarks(e.target.value)} /></FormField>
    </FormDialog>
  );
}

export default function StockPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [view, setView] = useState<View>("levels");
  const [adjusting, setAdjusting] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [starting, setStarting] = useState(false);
  const [openCount, setOpenCount] = useState<string | null>(null);
  const adjustments = usePageState(15);
  const transfers = usePageState(15);
  const counts = usePageState(15);
  const adjQuery = useQuery({ queryKey: ["store", "adjustments", adjustments.pageNumber], queryFn: () => listAdjustments({ pageNumber: adjustments.pageNumber, pageSize: adjustments.pageSize }), enabled: view === "adjustments", placeholderData: (p) => p });
  const trfQuery = useQuery({ queryKey: ["store", "transfers", transfers.pageNumber], queryFn: () => listTransfers({ pageNumber: transfers.pageNumber, pageSize: transfers.pageSize }), enabled: view === "transfers", placeholderData: (p) => p });
  const cntQuery = useQuery({ queryKey: ["store", "counts", counts.pageNumber], queryFn: () => listCounts({ pageNumber: counts.pageNumber, pageSize: counts.pageSize }), enabled: view === "counts", placeholderData: (p) => p });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={view} onValueChange={(v) => setView(v as View)}>
          <TabsList>
            <TabsTrigger value="levels">{t("Stock levels")}</TabsTrigger>
            <TabsTrigger value="ledger">{t("Movement history")}</TabsTrigger>
            <TabsTrigger value="adjustments">{t("Adjustments")}</TabsTrigger>
            <TabsTrigger value="transfers">{t("Transfers")}</TabsTrigger>
            <TabsTrigger value="counts">{t("Physical counts")}</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex gap-2">
          {access.adjust && <Button variant="outline" onClick={() => setAdjusting(true)}><SlidersHorizontal className="h-4 w-4" /> {t("Adjust stock")}</Button>}
          {access.transfer && <Button variant="outline" onClick={() => setTransferring(true)}><ArrowLeftRight className="h-4 w-4" /> {t("Transfer")}</Button>}
          {access.adjust && <Button variant="outline" onClick={() => setStarting(true)}><ClipboardCheck className="h-4 w-4" /> {t("Start a count")}</Button>}
        </div>
      </div>

      {view === "levels" && <Levels />}
      {view === "ledger" && <Ledger />}
      {view === "adjustments" && (
        <PagedTable query={adjQuery} rowKey={(a) => a.id} pageIndex={adjustments.pageIndex} onPageChange={adjustments.setPageIndex} pageSize={adjustments.pageSize} emptyTitle={t("No adjustments yet")}
          emptyAction={access.adjust ? <Button onClick={() => setAdjusting(true)}><Plus className="h-4 w-4" /> {t("Adjust stock")}</Button> : undefined}
          columns={[
            { header: "Number", cell: (a) => <span className="font-medium">{a.reference}</span> },
            { header: "Date", cell: (a) => formatDate(a.adjustedOn) },
            { header: "Store", cell: (a) => a.storeName },
            { header: "Type", cell: (a) => <Badge variant="neutral">{t(ADJUSTMENT_LABEL[a.reason])}</Badge> },
            { header: "Items", cell: (a) => a.lines.map((l) => `${l.itemName} (${l.quantityChange > 0 ? "+" : ""}${qty(l.quantityChange)})`).join(", ") },
            { header: "Reason", cell: (a) => a.remarks },
            { header: "By", cell: (a) => a.adjustedBy ?? "—" },
          ]} />
      )}
      {view === "transfers" && (
        <PagedTable query={trfQuery} rowKey={(x) => x.id} pageIndex={transfers.pageIndex} onPageChange={transfers.setPageIndex} pageSize={transfers.pageSize} emptyTitle={t("No transfers yet")}
          columns={[
            { header: "Number", cell: (x) => <span className="font-medium">{x.reference}</span> },
            { header: "Date", cell: (x) => formatDate(x.transferredOn) },
            { header: "From", cell: (x) => x.fromStoreName },
            { header: "To", cell: (x) => x.toStoreName },
            { header: "Items", cell: (x) => x.lines.map((l) => `${l.itemName} × ${qty(l.quantity)}`).join(", ") },
            { header: "Value", align: "right", cell: (x) => money(x.value) },
            { header: "By", cell: (x) => x.transferredBy ?? "—" },
          ]} />
      )}
      {view === "counts" && (
        <PagedTable query={cntQuery} rowKey={(x) => x.id} onRowClick={(x) => setOpenCount(x.id)} pageIndex={counts.pageIndex} onPageChange={counts.setPageIndex} pageSize={counts.pageSize} emptyTitle={t("No physical counts yet")}
          emptyAction={access.adjust ? <Button onClick={() => setStarting(true)}><ClipboardCheck className="h-4 w-4" /> {t("Start a count")}</Button> : undefined}
          columns={[
            { header: "Number", cell: (x) => <span className="font-medium">{x.reference}</span> },
            { header: "Date", cell: (x) => formatDate(x.countDate) },
            { header: "Store", cell: (x) => x.storeName },
            { header: "Items", align: "right", cell: (x) => x.lineCount },
            { header: "Differences", align: "right", cell: (x) => x.varianceCount },
            { header: "Status", cell: (x) => <StatusBadge status={x.status} label={t(COUNT_STATUS_LABEL[x.status])} /> },
          ]} />
      )}
      <AdjustmentForm open={adjusting} onOpenChange={setAdjusting} />
      <TransferForm open={transferring} onOpenChange={setTransferring} />
      <StartCountForm open={starting} onOpenChange={setStarting} onStarted={(id) => { setView("counts"); setOpenCount(id); }} />
      <CountDialog id={openCount} onClose={() => setOpenCount(null)} />
    </div>
  );
}
