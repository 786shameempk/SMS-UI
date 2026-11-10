import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Check, PackagePlus, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { createReceipt, decideReceipt, getPurchaseOrder, listPurchaseOrders, listReceipts } from "../api";
import FormDialog from "../components/FormDialog";
import { RECEIPT_STATUS_LABEL } from "../constants";
import { Field, PagedTable, PrintableDialog, SelectField, SummaryGrid, formatDate, money, optional, options, qty, toNumber, todayIso, useApiMutation, usePageState, useStoreAccess } from "../shared";
import type { GoodsReceipt, PurchaseOrder, ReceiptStatus } from "../types";

function ReceiptForm({ open, onOpenChange, presetOrderId }: { open: boolean; onOpenChange: (v: boolean) => void; presetOrderId?: string }) {
  const { t } = useTranslation("store");
  const openOrders = useQuery({ queryKey: ["store", "purchase-orders", "open"], queryFn: () => listPurchaseOrders({ openOnly: true, pageSize: 200 }), enabled: open });
  const [orderId, setOrderId] = useState<string | undefined>();
  const [receivedOn, setReceivedOn] = useState(todayIso());
  const [invoiceNo, setInvoiceNo] = useState("");
  const [notes, setNotes] = useState("");
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [seeded, setSeeded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = open ? (presetOrderId ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) { setOrderId(presetOrderId); setReceivedOn(todayIso()); setInvoiceNo(""); setNotes(""); setQuantities({}); setErrors({}); }
  }
  const preset = useQuery({ queryKey: ["store", "purchase-order", presetOrderId], queryFn: () => getPurchaseOrder(presetOrderId!), enabled: open && Boolean(presetOrderId) });
  const order: PurchaseOrder | undefined = (openOrders.data?.items ?? []).find((o) => o.id === orderId) ?? (preset.data?.id === orderId ? preset.data : undefined);

  const save = useApiMutation(
    () => createReceipt({ purchaseOrderId: orderId!, receivedOn, supplierInvoiceNumber: optional(invoiceNo), notes: optional(notes), lines: order!.lines.filter((l) => toNumber(quantities[l.id] ?? "") > 0).map((l) => ({ purchaseOrderLineId: l.id, quantity: toNumber(quantities[l.id]) })) }),
    { success: (g) => (g.status === "Approved" ? "Goods received and added to stock" : "Receipt recorded; stock is added once it is approved"), invalidate: [["store"]], onSuccess: () => onOpenChange(false) },
  );
  const submit = () => {
    const next: Record<string, string> = {};
    if (!order) next.order = t("Choose the purchase order");
    else if (order.lines.every((l) => toNumber(quantities[l.id] ?? "") <= 0)) next.lines = t("Enter the quantity received for at least one item");
    else if (order.lines.some((l) => toNumber(quantities[l.id] ?? "") > l.pendingQuantity)) next.lines = t("A quantity is more than is still to be received");
    if (receivedOn > todayIso()) next.date = t("The receipt date is in the future");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(undefined);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t("Record goods received")} description={t("Stock is added for exactly what you enter here.")} submitLabel={t("Record receipt")} submitting={save.isPending} onSubmit={submit} size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("Purchase order")} required error={errors.order} className="sm:col-span-2">
          <SelectField value={orderId} onChange={(v) => { setOrderId(v); setQuantities({}); }} placeholder={t("Choose an open order")} items={(openOrders.data?.items ?? []).map((o) => ({ value: o.id, label: `${o.reference} · ${o.supplierName}` }))} />
        </FormField>
        <FormField label={t("Date received")} htmlFor="grn-date" error={errors.date}><Input id="grn-date" type="date" value={receivedOn} max={todayIso()} onChange={(e) => setReceivedOn(e.target.value)} /></FormField>
        <FormField label={t("Supplier's invoice / challan number")} htmlFor="grn-invoice" optional><Input id="grn-invoice" value={invoiceNo} onChange={(e) => setInvoiceNo(e.target.value)} maxLength={60} /></FormField>
      </div>
      {order && (
        <div className="overflow-x-auto rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead><tr className="border-b bg-muted/40 text-left"><th className="p-2">{t("Item")}</th><th className="p-2 text-right">{t("Ordered")}</th><th className="p-2 text-right">{t("Already received")}</th><th className="w-32 p-2">{t("Receiving now")}</th></tr></thead>
            <tbody>
              {order.lines.map((l) => (
                <tr key={l.id} className="border-b">
                  <td className="p-2">{l.itemName}<span className="block text-xs text-muted-foreground">{l.sku}</span></td>
                  <td className="p-2 text-right tabular-nums">{qty(l.quantity)} {l.unit}</td>
                  <td className="p-2 text-right tabular-nums">{qty(l.receivedQuantity)}</td>
                  <td className="p-2"><Input inputMode="decimal" aria-label={t("Receiving now: {{name}}", { name: l.itemName })} disabled={l.pendingQuantity <= 0} value={quantities[l.id] ?? ""} placeholder={String(l.pendingQuantity)} onChange={(e) => setQuantities({ ...quantities, [l.id]: e.target.value })} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {order && <button type="button" className="text-sm text-primary hover:underline" onClick={() => setQuantities(Object.fromEntries(order.lines.map((l) => [l.id, String(l.pendingQuantity)])))}>{t("Fill with everything still due")}</button>}
      {errors.lines && <p role="alert" className="text-xs text-destructive-strong">{errors.lines}</p>}
      <FormField label={t("Notes")} htmlFor="grn-notes" optional><Textarea id="grn-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t("Condition of the goods, shortages")} /></FormField>
    </FormDialog>
  );
}

function ReceiptView({ receipt, onClose }: { receipt: GoodsReceipt | null; onClose: () => void }) {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [note, setNote] = useState("");
  const decide = useApiMutation((approve: boolean) => decideReceipt(receipt!.id, approve, note), { success: (g) => (g.status === "Approved" ? "Receipt approved and stock added" : "Receipt rejected"), invalidate: [["store"]], onSuccess: () => { setNote(""); onClose(); } });
  const g = receipt;
  return (
    <PrintableDialog
      open={g !== null}
      onOpenChange={(v) => !v && onClose()}
      title={g ? t("Goods Received Note {{ref}}", { ref: g.reference }) : ""}
      wide
      actions={g?.status === "Pending" && (
        <>
          {access.reject && <Button variant="outline" disabled={decide.isPending || !note.trim()} onClick={() => decide.mutate(false)}><X className="h-4 w-4" /> {t("Reject")}</Button>}
          {access.approve && <Button disabled={decide.isPending} onClick={() => decide.mutate(true)}><Check className="h-4 w-4" /> {t("Approve and add to stock")}</Button>}
        </>
      )}
    >
      {g && (
        <>
          <SummaryGrid>
            <Field label={t("Status")}><StatusBadge status={g.status} label={t(RECEIPT_STATUS_LABEL[g.status])} /></Field>
            <Field label={t("Order")}>{g.purchaseOrderReference}</Field>
            <Field label={t("Supplier")}>{g.supplierName}</Field>
            <Field label={t("Store")}>{g.storeName}</Field>
            <Field label={t("Date received")}>{formatDate(g.receivedOn)}</Field>
            <Field label={t("Received by")}>{g.receivedBy}</Field>
            <Field label={t("Supplier invoice")}>{g.supplierInvoiceNumber}</Field>
            <Field label={t("Value")}>{money(g.value)}</Field>
            <Field label={t("Decided by")}>{g.decidedBy}</Field>
          </SummaryGrid>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1">{t("Item")}</th><th className="py-1 text-right">{t("Quantity")}</th><th className="py-1 text-right">{t("Unit cost")}</th><th className="py-1 text-right">{t("Amount")}</th></tr></thead>
            <tbody>{g.lines.map((l) => <tr key={l.id} className="border-b"><td className="py-1">{l.itemName} <span className="text-xs text-muted-foreground">{l.sku}</span></td><td className="py-1 text-right tabular-nums">{qty(l.quantity)} {l.unit}</td><td className="py-1 text-right tabular-nums">{money(l.unitCost)}</td><td className="py-1 text-right tabular-nums">{money(l.quantity * l.unitCost)}</td></tr>)}</tbody>
          </table>
          {g.notes && <p className="text-sm text-muted-foreground">{g.notes}</p>}
          {g.status === "Pending" && access.reject && <div className="store-no-print"><FormField label={t("Reason for rejecting")} htmlFor="grn-reject" hint={t("Required to reject")}><Input id="grn-reject" value={note} onChange={(e) => setNote(e.target.value)} /></FormField></div>}
        </>
      )}
    </PrintableDialog>
  );
}

export default function ReceiptsPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [params, setParams] = useSearchParams();
  const presetOrder = params.get("po") ?? undefined;
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<ReceiptStatus | undefined>();
  const paging = usePageState(15);
  const [formOpen, setFormOpen] = useState(Boolean(presetOrder));
  const [viewing, setViewing] = useState<GoodsReceipt | null>(null);
  const filters = { search: search.trim() || undefined, status, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const query = useQuery({ queryKey: ["store", "receipts", filters], queryFn: () => listReceipts(filters), placeholderData: (p) => p });
  const closeForm = (v: boolean) => { setFormOpen(v); if (!v && presetOrder) { const next = new URLSearchParams(params); next.delete("po"); setParams(next, { replace: true }); } };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={(v) => { setSearch(v); paging.reset(); }} placeholder={t("Search by GRN or supplier invoice number")} aria-label={t("Search goods receipts")} /></div>
        <div className="w-48"><SelectField value={status} onChange={(v) => { setStatus(v); paging.reset(); }} allLabel={t("Any status")} items={options(RECEIPT_STATUS_LABEL)} /></div>
        {access.receive && <Button onClick={() => setFormOpen(true)}><PackagePlus className="h-4 w-4" /> {t("Receive goods")}</Button>}
      </div>
      <PagedTable
        query={query}
        rowKey={(g) => g.id}
        onRowClick={setViewing}
        pageIndex={paging.pageIndex}
        onPageChange={paging.setPageIndex}
        pageSize={paging.pageSize}
        emptyTitle={t("No goods receipts")}
        emptyDescription={t("A receipt is recorded against a placed purchase order.")}
        columns={[
          { header: "GRN", cell: (g) => <span className="font-medium">{g.reference}</span> },
          { header: "Date", cell: (g) => formatDate(g.receivedOn) },
          { header: "Order", cell: (g) => g.purchaseOrderReference },
          { header: "Supplier", cell: (g) => g.supplierName },
          { header: "Store", cell: (g) => g.storeName },
          { header: "Items", align: "right", cell: (g) => g.lines.length },
          { header: "Value", align: "right", cell: (g) => money(g.value) },
          { header: "Status", cell: (g) => <StatusBadge status={g.status} label={t(RECEIPT_STATUS_LABEL[g.status])} /> },
        ]}
      />
      <ReceiptForm open={formOpen} onOpenChange={closeForm} presetOrderId={presetOrder} />
      <ReceiptView receipt={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
