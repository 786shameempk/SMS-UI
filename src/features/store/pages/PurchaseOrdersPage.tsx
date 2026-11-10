import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Ban, FileText, PackageCheck, Plus, Send, Wallet } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cancelInvoice, cancelPurchaseOrder, closePurchaseOrder, createInvoice, createPurchaseOrder, getRequisition, listInvoices, listPurchaseOrders, listSuppliers, payInvoice, placePurchaseOrder, updatePurchaseOrder } from "../api";
import FormDialog from "../components/FormDialog";
import { INVOICE_STATUS_LABEL, PAYMENT_LABEL, PO_STATUS_LABEL } from "../constants";
import { Field, LinesEditor, PagedTable, PrintableDialog, SelectField, StoreSelect, SummaryGrid, formatDate, money, newLine, optional, options, qty, toNumber, todayIso, useApiMutation, useItemCatalogue, usePageState, useStoreAccess, type EditableLine } from "../shared";
import type { InvoiceStatus, PaymentMethod, PurchaseOrder, PurchaseOrderStatus, SupplierInvoice } from "../types";

/** What a line comes to, the same way the server prices it. */
export const lineTotal = (l: EditableLine) => {
  const gross = toNumber(l.quantity) * toNumber(l.price);
  const net = gross - (gross * toNumber(l.discount)) / 100;
  return net + (net * toNumber(l.tax)) / 100;
};

function useSuppliersForPicker(enabled: boolean) {
  return useQuery({ queryKey: ["store", "suppliers", "pick"], queryFn: () => listSuppliers({ active: true, pageSize: 200 }), enabled, staleTime: 60_000 });
}

function PurchaseOrderForm({ open, onOpenChange, order, requisitionId }: { open: boolean; onOpenChange: (v: boolean) => void; order: PurchaseOrder | null; requisitionId?: string }) {
  const { t } = useTranslation("store");
  const suppliers = useSuppliersForPicker(open);
  const catalogue = useItemCatalogue();
  const requisition = useQuery({ queryKey: ["store", "requisition", requisitionId], queryFn: () => getRequisition(requisitionId!), enabled: open && Boolean(requisitionId) });
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [storeId, setStoreId] = useState<string | undefined>();
  const [expected, setExpected] = useState("");
  const [terms, setTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);
  const [seeded, setSeeded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = open ? `${order?.id ?? "new"}:${requisitionId ?? ""}:${requisition.data?.id ?? ""}` : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) {
      if (order) {
        setSupplierId(order.supplierId); setStoreId(order.storeId); setExpected(order.expectedDate ?? ""); setTerms(order.paymentTerms ?? ""); setNotes(order.notes ?? "");
        setLines(order.lines.map((l) => newLine({ itemId: l.itemId, quantity: String(l.quantity), price: String(l.unitPrice), discount: String(l.discountPercent || ""), tax: String(l.taxPercent || "") })));
      } else if (requisition.data) {
        const r = requisition.data;
        setSupplierId(undefined); setStoreId(r.storeId); setExpected(""); setTerms(""); setNotes(`${t("From requisition")} ${r.reference}`);
        setLines(r.lines.map((l) => newLine({ itemId: l.itemId, quantity: String(l.quantity), price: String(l.estimatedPrice || ""), tax: String((catalogue.data ?? []).find((i) => i.id === l.itemId)?.taxPercent || "") })));
      } else {
        setSupplierId(undefined); setStoreId(undefined); setExpected(""); setTerms(""); setNotes(""); setLines([newLine()]);
      }
      setErrors({});
    }
  }

  const save = useApiMutation(
    (place: boolean) => {
      const body = {
        supplierId: supplierId!, storeId: storeId!, requisitionId: order?.requisitionId ?? (requisitionId ?? null), expectedDate: optional(expected), notes: optional(notes), paymentTerms: optional(terms), place,
        lines: lines.map((l) => ({ itemId: l.itemId, quantity: toNumber(l.quantity), unitPrice: toNumber(l.price), discountPercent: toNumber(l.discount), taxPercent: toNumber(l.tax) })),
      };
      return order ? updatePurchaseOrder(order.id, body) : createPurchaseOrder(body);
    },
    { success: (p) => (p.status === "Ordered" ? "Purchase order placed" : "Draft saved"), invalidate: [["store", "purchase-orders"], ["store", "requisitions"], ["store", "dashboard"]], onSuccess: () => onOpenChange(false) },
  );

  const run = (place: boolean) => {
    const next: Record<string, string> = {};
    if (!supplierId) next.supplier = t("Choose the supplier");
    if (!storeId) next.store = t("Choose the store the goods are for");
    if (lines.some((l) => !l.itemId || toNumber(l.quantity) <= 0)) next.lines = t("Every line needs an item and a quantity above zero");
    else if (new Set(lines.map((l) => l.itemId)).size !== lines.length) next.lines = t("An item appears more than once");
    else if (lines.some((l) => toNumber(l.discount) > 100 || toNumber(l.tax) > 100)) next.lines = t("Discount and tax cannot be more than 100%");
    if (expected && expected < todayIso()) next.expected = t("The expected date is in the past");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(place);
  };

  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={order ? t("Edit purchase order {{ref}}", { ref: order.reference }) : t("New purchase order")} submitLabel={t("Place order")} submitting={save.isPending} onSubmit={() => run(true)} size="xl"
      extraActions={<Button type="button" variant="secondary" disabled={save.isPending} onClick={() => run(false)}>{t("Save as draft")}</Button>}>
      <div className="grid gap-4 md:grid-cols-4">
        <FormField label={t("Supplier")} required error={errors.supplier}><SelectField value={supplierId} onChange={(v) => { setSupplierId(v); const s = (suppliers.data?.items ?? []).find((x) => x.id === v); if (s && !terms) setTerms(s.paymentTerms ?? ""); }} items={(suppliers.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))} /></FormField>
        <FormField label={t("Deliver to store")} required error={errors.store}><StoreSelect value={storeId} onChange={setStoreId} /></FormField>
        <FormField label={t("Expected by")} htmlFor="po-expected" optional error={errors.expected}><Input id="po-expected" type="date" value={expected} onChange={(e) => setExpected(e.target.value)} /></FormField>
        <FormField label={t("Payment terms")} htmlFor="po-terms" optional><Input id="po-terms" value={terms} onChange={(e) => setTerms(e.target.value)} /></FormField>
      </div>
      <LinesEditor lines={lines} onChange={setLines} showPrice priceLabel={t("Unit price")} showDiscount showTax itemList={catalogue.data}
        onItemPicked={(line, item) => (item ? { price: line.price || String(item.purchasePrice || ""), tax: line.tax || String(item.taxPercent || "") } : {})} />
      {errors.lines && <p role="alert" className="text-xs text-destructive-strong">{errors.lines}</p>}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <FormField label={t("Notes")} htmlFor="po-notes" optional className="min-w-64 flex-1"><Textarea id="po-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
        <p className="text-lg font-semibold tabular-nums">{t("Order total")}: {money(total)}</p>
      </div>
    </FormDialog>
  );
}

function PurchaseOrderView({ order, onClose, onEdit, onInvoice }: { order: PurchaseOrder | null; onClose: () => void; onEdit: (o: PurchaseOrder) => void; onInvoice: (o: PurchaseOrder) => void }) {
  const { t } = useTranslation("store");
  const navigate = useNavigate();
  const access = useStoreAccess();
  const done = { onSuccess: () => onClose(), invalidate: [["store", "purchase-orders"], ["store", "requisitions"], ["store", "dashboard"]] };
  const place = useApiMutation((id: string) => placePurchaseOrder(id), { ...done, success: "Purchase order placed" });
  const cancel = useApiMutation((id: string) => cancelPurchaseOrder(id), { ...done, success: "Purchase order cancelled" });
  const close = useApiMutation((id: string) => closePurchaseOrder(id), { ...done, success: "Order closed as complete" });
  const o = order;
  const open = o && (o.status === "Ordered" || o.status === "PartiallyReceived");
  return (
    <PrintableDialog
      open={o !== null}
      onOpenChange={(v) => !v && onClose()}
      title={o ? t("Purchase order {{ref}}", { ref: o.reference }) : ""}
      wide
      actions={o && (
        <>
          {o.status === "Draft" && access.edit && <Button variant="outline" onClick={() => onEdit(o)}>{t("Edit")}</Button>}
          {o.status === "Draft" && access.create && <Button onClick={() => place.mutate(o.id)} disabled={place.isPending}><Send className="h-4 w-4" /> {t("Place order")}</Button>}
          {open && access.receive && <Button onClick={() => navigate(`/store/receipts?po=${o.id}`)}><PackageCheck className="h-4 w-4" /> {t("Receive goods")}</Button>}
          {o.status !== "Draft" && o.status !== "Cancelled" && access.create && <Button variant="outline" onClick={() => onInvoice(o)}><FileText className="h-4 w-4" /> {t("Record supplier invoice")}</Button>}
          {o.status === "PartiallyReceived" && access.edit && <Button variant="outline" onClick={() => close.mutate(o.id)} disabled={close.isPending}>{t("Close as complete")}</Button>}
          {["Draft", "Ordered"].includes(o.status) && access.edit && <Button variant="ghost" onClick={() => cancel.mutate(o.id)} disabled={cancel.isPending}><Ban className="h-4 w-4" /> {t("Cancel order")}</Button>}
        </>
      )}
    >
      {o && (
        <>
          <SummaryGrid>
            <Field label={t("Status")}><StatusBadge status={o.status} label={t(PO_STATUS_LABEL[o.status])} /></Field>
            <Field label={t("Supplier")}>{o.supplierName}</Field>
            <Field label={t("Deliver to")}>{o.storeName}</Field>
            <Field label={t("Order date")}>{formatDate(o.orderDate)}</Field>
            <Field label={t("Expected by")}>{formatDate(o.expectedDate)}</Field>
            <Field label={t("Requisition")}>{o.requisitionReference}</Field>
            <Field label={t("Payment terms")}>{o.paymentTerms}</Field>
            <Field label={t("Goods receipts")}>{o.receiptCount}</Field>
            <Field label={t("Invoiced")}>{money(o.invoicedAmount)}</Field>
          </SummaryGrid>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left"><th className="py-1">{t("Item")}</th><th className="py-1 text-right">{t("Ordered")}</th><th className="py-1 text-right">{t("Received")}</th><th className="py-1 text-right">{t("Price")}</th><th className="py-1 text-right">{t("Disc. %")}</th><th className="py-1 text-right">{t("Tax %")}</th><th className="py-1 text-right">{t("Amount")}</th></tr></thead>
              <tbody>{o.lines.map((l) => <tr key={l.id} className="border-b"><td className="py-1">{l.itemName}</td><td className="py-1 text-right tabular-nums">{qty(l.quantity)} {l.unit}</td><td className="py-1 text-right tabular-nums">{qty(l.receivedQuantity)}</td><td className="py-1 text-right tabular-nums">{money(l.unitPrice)}</td><td className="py-1 text-right tabular-nums">{l.discountPercent}</td><td className="py-1 text-right tabular-nums">{l.taxPercent}</td><td className="py-1 text-right tabular-nums">{money(l.lineTotal)}</td></tr>)}</tbody>
            </table>
          </div>
          <div className="ml-auto w-64 space-y-0.5 text-sm tabular-nums">
            <div className="flex justify-between"><span>{t("Subtotal")}</span><span>{money(o.subtotal)}</span></div>
            <div className="flex justify-between"><span>{t("Discount")}</span><span>-{money(o.discountTotal)}</span></div>
            <div className="flex justify-between"><span>{t("Tax")}</span><span>{money(o.taxTotal)}</span></div>
            <div className="flex justify-between border-t pt-1 text-base font-semibold"><span>{t("Total")}</span><span>{money(o.total)}</span></div>
          </div>
          {o.notes && <p className="text-sm text-muted-foreground">{o.notes}</p>}
        </>
      )}
    </PrintableDialog>
  );
}

function InvoiceForm({ open, onOpenChange, order }: { open: boolean; onOpenChange: (v: boolean) => void; order: PurchaseOrder | null }) {
  const { t } = useTranslation("store");
  const suppliers = useSuppliersForPicker(open);
  const [number, setNumber] = useState("");
  const [supplierId, setSupplierId] = useState<string | undefined>();
  const [invoiceDate, setInvoiceDate] = useState(todayIso());
  const [due, setDue] = useState("");
  const [amount, setAmount] = useState("");
  const [seeded, setSeeded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = open ? (order?.id ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) { setNumber(""); setSupplierId(order?.supplierId); setInvoiceDate(todayIso()); setDue(""); setAmount(order ? String(Math.max(0, order.total - order.invoicedAmount) || "") : ""); setErrors({}); }
  }
  const save = useApiMutation(() => createInvoice({ invoiceNumber: number.trim(), supplierId: supplierId!, purchaseOrderId: order?.id ?? null, invoiceDate, dueDate: optional(due), amount: toNumber(amount) }),
    { success: "Invoice recorded", invalidate: [["store", "invoices"], ["store", "purchase-orders"], ["store", "dashboard"]], onSuccess: () => onOpenChange(false) });
  const submit = () => {
    const next: Record<string, string> = {};
    if (!number.trim()) next.number = t("Enter the supplier's invoice number");
    if (!supplierId) next.supplier = t("Choose the supplier");
    if (toNumber(amount) <= 0) next.amount = t("Enter the invoice amount");
    if (due && due < invoiceDate) next.due = t("The due date is before the invoice date");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(undefined);
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={order ? t("Supplier invoice for {{ref}}", { ref: order.reference }) : t("Record supplier invoice")} submitLabel={t("Record invoice")} submitting={save.isPending} onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("Invoice number")} htmlFor="inv-number" required error={errors.number}><Input id="inv-number" value={number} onChange={(e) => setNumber(e.target.value)} maxLength={60} /></FormField>
        <FormField label={t("Supplier")} required error={errors.supplier}><SelectField value={supplierId} onChange={setSupplierId} disabled={Boolean(order)} items={(suppliers.data?.items ?? []).map((s) => ({ value: s.id, label: s.name }))} /></FormField>
        <FormField label={t("Invoice date")} htmlFor="inv-date"><Input id="inv-date" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} /></FormField>
        <FormField label={t("Due date")} htmlFor="inv-due" optional hint={t("Left empty, the supplier's payment terms are used")} error={errors.due}><Input id="inv-due" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></FormField>
        <FormField label={t("Amount")} htmlFor="inv-amount" required error={errors.amount}><Input id="inv-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
      </div>
    </FormDialog>
  );
}

function InvoiceView({ invoice, onClose }: { invoice: SupplierInvoice | null; onClose: () => void }) {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("BankTransfer");
  const [reference, setReference] = useState("");
  const [seededInvoice, setSeededInvoice] = useState<string | null>(null);
  if ((invoice?.id ?? null) !== seededInvoice) { setSeededInvoice(invoice?.id ?? null); if (invoice) { setAmount(String(invoice.balance || "")); setReference(""); } }
  const done = { onSuccess: () => onClose(), invalidate: [["store", "invoices"], ["store", "suppliers"], ["store", "dashboard"]] };
  const pay = useApiMutation(() => payInvoice(invoice!.id, { amount: toNumber(amount), method, paymentReference: reference.trim() || undefined }), { ...done, success: "Payment recorded" });
  const cancel = useApiMutation(() => cancelInvoice(invoice!.id), { ...done, success: "Invoice cancelled" });
  const i = invoice;
  const canPay = i && access.create && (i.status === "Unpaid" || i.status === "Partial");
  return (
    <PrintableDialog open={i !== null} onOpenChange={(v) => !v && onClose()} title={i ? t("Invoice {{no}}", { no: i.invoiceNumber }) : ""} actions={i && i.paidAmount === 0 && i.status !== "Cancelled" && access.remove && <Button variant="ghost" onClick={() => cancel.mutate(undefined)}>{t("Cancel invoice")}</Button>}>
      {i && (
        <>
          <SummaryGrid>
            <Field label={t("Supplier")}>{i.supplierName}</Field>
            <Field label={t("Order")}>{i.purchaseOrderReference}</Field>
            <Field label={t("Status")}><StatusBadge status={i.overdue ? "overdue" : i.status} label={i.overdue ? t("Overdue") : t(INVOICE_STATUS_LABEL[i.status])} /></Field>
            <Field label={t("Invoice date")}>{formatDate(i.invoiceDate)}</Field>
            <Field label={t("Due date")}>{formatDate(i.dueDate)}</Field>
            <Field label={t("Amount / paid / balance")}>{money(i.amount)} / {money(i.paidAmount)} / {money(i.balance)}</Field>
          </SummaryGrid>
          {i.payments.length > 0 && <div><p className="mb-1 text-sm font-medium">{t("Payments")}</p>{i.payments.map((p) => <div key={p.id} className="flex justify-between border-b py-1 text-sm"><span>{formatDate(p.paidOn)} · {t(PAYMENT_LABEL[p.method])}{p.paymentReference ? ` · ${p.paymentReference}` : ""}</span><span className="tabular-nums">{money(p.amount)}</span></div>)}</div>}
          {canPay && (
            <div className="store-no-print space-y-3 rounded-lg border border-border p-3">
              <p className="flex items-center gap-1 text-sm font-medium"><Wallet className="h-4 w-4" /> {t("Record a payment")}</p>
              <div className="grid gap-3 sm:grid-cols-3">
                <FormField label={t("Amount")} htmlFor="pay-amount"><Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></FormField>
                <FormField label={t("Method")}><SelectField value={method} onChange={(v) => setMethod(v ?? "Cash")} items={options(PAYMENT_LABEL)} /></FormField>
                <FormField label={t("Reference")} htmlFor="pay-ref" optional><Input id="pay-ref" value={reference} onChange={(e) => setReference(e.target.value)} /></FormField>
              </div>
              <Button onClick={() => pay.mutate(undefined)} disabled={pay.isPending || toNumber(amount) <= 0 || toNumber(amount) > i.balance}>{t("Record payment")}</Button>
            </div>
          )}
        </>
      )}
    </PrintableDialog>
  );
}

export default function PurchaseOrdersPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [params, setParams] = useSearchParams();
  const fromRequisition = params.get("fromRequisition") ?? undefined;
  const [tab, setTab] = useState<"orders" | "invoices">("orders");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PurchaseOrderStatus | undefined>();
  const [invStatus, setInvStatus] = useState<InvoiceStatus | undefined>();
  const [overdueOnly, setOverdueOnly] = useState(false);
  const paging = usePageState(15);
  const [editing, setEditing] = useState<PurchaseOrder | null>(null);
  const [formOpen, setFormOpen] = useState(Boolean(fromRequisition));
  const [viewing, setViewing] = useState<PurchaseOrder | null>(null);
  const [invoiceFor, setInvoiceFor] = useState<PurchaseOrder | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<SupplierInvoice | null>(null);
  const orderFilters = { search: search.trim() || undefined, status, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const invoiceFilters = { search: search.trim() || undefined, status: invStatus, overdueOnly, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const orders = useQuery({ queryKey: ["store", "purchase-orders", orderFilters], queryFn: () => listPurchaseOrders(orderFilters), placeholderData: (p) => p, enabled: tab === "orders" });
  const invoices = useQuery({ queryKey: ["store", "invoices", invoiceFilters], queryFn: () => listInvoices(invoiceFilters), placeholderData: (p) => p, enabled: tab === "invoices" });
  const openForm = (o: PurchaseOrder | null) => { setEditing(o); setViewing(null); setFormOpen(true); };
  const closeForm = (v: boolean) => { setFormOpen(v); if (!v && fromRequisition) { const next = new URLSearchParams(params); next.delete("fromRequisition"); setParams(next, { replace: true }); } };

  return (
    <div className="space-y-4">
      <Tabs value={tab} onValueChange={(v) => { setTab(v as "orders" | "invoices"); paging.reset(); setSearch(""); }}>
        <TabsList>
          <TabsTrigger value="orders">{t("Purchase orders")}</TabsTrigger>
          <TabsTrigger value="invoices">{t("Supplier invoices and payments")}</TabsTrigger>
        </TabsList>
      </Tabs>
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={(v) => { setSearch(v); paging.reset(); }} placeholder={tab === "orders" ? t("Search by order number") : t("Search by invoice number")} aria-label={t("Search")} /></div>
        {tab === "orders" ? (
          <div className="w-48"><SelectField value={status} onChange={(v) => { setStatus(v); paging.reset(); }} allLabel={t("Any status")} items={options(PO_STATUS_LABEL)} /></div>
        ) : (
          <>
            <div className="w-44"><SelectField value={invStatus} onChange={(v) => { setInvStatus(v); paging.reset(); }} allLabel={t("Any status")} items={options(INVOICE_STATUS_LABEL)} /></div>
            <Button variant={overdueOnly ? "default" : "outline"} aria-pressed={overdueOnly} onClick={() => { setOverdueOnly(!overdueOnly); paging.reset(); }}>{t("Overdue only")}</Button>
          </>
        )}
        {access.create && tab === "orders" && <Button onClick={() => openForm(null)}><Plus className="h-4 w-4" /> {t("New purchase order")}</Button>}
        {access.create && tab === "invoices" && <Button onClick={() => { setInvoiceFor(null); setInvoiceOpen(true); }}><Plus className="h-4 w-4" /> {t("Record invoice")}</Button>}
      </div>

      {tab === "orders" ? (
        <PagedTable
          query={orders}
          rowKey={(o) => o.id}
          onRowClick={setViewing}
          pageIndex={paging.pageIndex}
          onPageChange={paging.setPageIndex}
          pageSize={paging.pageSize}
          emptyTitle={t("No purchase orders")}
          emptyAction={access.create ? <Button onClick={() => openForm(null)}><Plus className="h-4 w-4" /> {t("New purchase order")}</Button> : undefined}
          columns={[
            { header: "Number", cell: (o) => <span className="font-medium">{o.reference}</span> },
            { header: "Date", cell: (o) => formatDate(o.orderDate) },
            { header: "Supplier", cell: (o) => o.supplierName },
            { header: "Store", cell: (o) => o.storeName },
            { header: "Expected", cell: (o) => formatDate(o.expectedDate) },
            { header: "Total", align: "right", cell: (o) => money(o.total) },
            { header: "Received", align: "right", cell: (o) => `${Math.round((o.lines.reduce((s, l) => s + Math.min(l.receivedQuantity, l.quantity), 0) / Math.max(1, o.lines.reduce((s, l) => s + l.quantity, 0))) * 100)}%` },
            { header: "Status", cell: (o) => <StatusBadge status={o.status} label={t(PO_STATUS_LABEL[o.status])} /> },
          ]}
        />
      ) : (
        <PagedTable
          query={invoices}
          rowKey={(i) => i.id}
          onRowClick={setViewInvoice}
          pageIndex={paging.pageIndex}
          onPageChange={paging.setPageIndex}
          pageSize={paging.pageSize}
          emptyTitle={t("No supplier invoices")}
          columns={[
            { header: "Invoice", cell: (i) => <span className="font-medium">{i.invoiceNumber}</span> },
            { header: "Supplier", cell: (i) => i.supplierName },
            { header: "Order", cell: (i) => i.purchaseOrderReference ?? "—" },
            { header: "Due", cell: (i) => formatDate(i.dueDate) },
            { header: "Amount", align: "right", cell: (i) => money(i.amount) },
            { header: "Balance", align: "right", cell: (i) => money(i.balance) },
            { header: "Status", cell: (i) => <StatusBadge status={i.overdue ? "overdue" : i.status} label={i.overdue ? t("Overdue") : t(INVOICE_STATUS_LABEL[i.status])} /> },
          ]}
        />
      )}

      <PurchaseOrderForm open={formOpen} onOpenChange={closeForm} order={editing} requisitionId={editing ? undefined : fromRequisition} />
      <PurchaseOrderView order={viewing} onClose={() => setViewing(null)} onEdit={openForm} onInvoice={(o) => { setViewing(null); setInvoiceFor(o); setInvoiceOpen(true); }} />
      <InvoiceForm open={invoiceOpen} onOpenChange={setInvoiceOpen} order={invoiceFor} />
      <InvoiceView invoice={viewInvoice} onClose={() => setViewInvoice(null)} />
    </div>
  );
}
