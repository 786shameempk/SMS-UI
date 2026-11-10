import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/ui/combobox";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { createSale, listSales, paySale } from "../api";
import FormDialog from "../components/FormDialog";
import { useRecipientOptions } from "../components/RecipientPicker";
import { BUYER_LABEL, PAYMENT_LABEL, SALE_STATUS_LABEL } from "../constants";
import { Field, LinesEditor, PagedTable, PrintableDialog, SelectField, StoreSelect, SummaryGrid, formatDate, formatDateTime, money, newLine, options, qty, toNumber, useApiMutation, useItemCatalogue, usePageState, useStoreAccess, type EditableLine } from "../shared";
import type { BuyerType, PaymentMethod, Sale, SalePaymentStatus } from "../types";

interface PaymentRow { key: number; amount: string; method: PaymentMethod; reference: string }

function SaleForm({ open, onOpenChange, onSold }: { open: boolean; onOpenChange: (v: boolean) => void; onSold: (s: Sale) => void }) {
  const { t } = useTranslation("store");
  const [storeId, setStoreId] = useState<string | undefined>();
  const [buyerType, setBuyerType] = useState<BuyerType>("Student");
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [buyerName, setBuyerName] = useState("");
  const [buyerDetail, setBuyerDetail] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<EditableLine[]>([newLine()]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [seeded, setSeeded] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const catalogue = useItemCatalogue(storeId);
  const kind = buyerType === "Staff" ? "Staff" : "Student";
  const people = useRecipientOptions(kind, open && buyerType !== "WalkIn");
  if (open !== seeded) {
    setSeeded(open);
    if (open) { setStoreId(undefined); setBuyerType("Student"); setBuyerId(null); setBuyerName(""); setBuyerDetail(""); setNotes(""); setLines([newLine()]); setPayments([]); setErrors({}); }
  }

  const items = catalogue.data ?? [];
  const priced = lines.map((l) => {
    const item = items.find((i) => i.id === l.itemId);
    const gross = toNumber(l.quantity) * toNumber(l.price);
    const discount = (gross * toNumber(l.discount)) / 100;
    const tax = ((gross - discount) * (item?.taxPercent ?? 0)) / 100;
    return { gross, discount, tax };
  });
  const subtotal = priced.reduce((s, p) => s + p.gross, 0);
  const discountTotal = priced.reduce((s, p) => s + p.discount, 0);
  const taxTotal = priced.reduce((s, p) => s + p.tax, 0);
  const total = Math.round((subtotal - discountTotal + taxTotal) * 100) / 100;
  const paid = payments.reduce((s, p) => s + toNumber(p.amount), 0);

  const save = useApiMutation(
    () => createSale({
      storeId: storeId!, buyerType, studentId: buyerType === "Student" || buyerType === "Parent" ? buyerId : null, buyerName: buyerName.trim(), buyerDetail: buyerDetail.trim() || null, notes: notes.trim() || null,
      lines: lines.map((l) => ({ itemId: l.itemId, quantity: toNumber(l.quantity), unitPrice: toNumber(l.price), discountPercent: toNumber(l.discount) })),
      payments: payments.filter((p) => toNumber(p.amount) > 0).map((p) => ({ amount: toNumber(p.amount), method: p.method, paymentReference: p.reference.trim() || null })),
    }),
    { success: "Sale recorded", invalidate: [["store"]], onSuccess: (s) => { onOpenChange(false); onSold(s); } },
  );

  const submit = () => {
    const next: Record<string, string> = {};
    if (!storeId) next.store = t("Choose the store");
    if (!buyerName.trim()) next.buyer = buyerType === "WalkIn" ? t("Enter the buyer's name") : t("Choose the buyer");
    if (lines.some((l) => !l.itemId || toNumber(l.quantity) <= 0)) next.lines = t("Every line needs an item and a quantity above zero");
    else if (new Set(lines.map((l) => l.itemId)).size !== lines.length) next.lines = t("An item appears more than once");
    else if (lines.some((l) => items.find((i) => i.id === l.itemId)?.sellingPrice == null && toNumber(l.price) <= 0)) next.lines = t("An item has no selling price. Set one on the item first.");
    if (lines.some((l) => toNumber(l.discount) > 100)) next.lines = t("A discount cannot be more than 100%");
    if (paid > total + 0.001) next.payments = t("The payments add up to more than the total");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(undefined);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={t("New sale")} description={t("Stock is deducted as soon as the sale is recorded.")} submitLabel={t("Record sale")} submitting={save.isPending} onSubmit={submit} size="xl">
      <div className="grid gap-4 md:grid-cols-3">
        <FormField label={t("Sell from store")} required error={errors.store}><StoreSelect value={storeId} onChange={setStoreId} /></FormField>
        <FormField label={t("Buyer")}><SelectField value={buyerType} onChange={(v) => { setBuyerType(v ?? "Student"); setBuyerId(null); setBuyerName(""); setBuyerDetail(""); }} items={options(BUYER_LABEL)} /></FormField>
        <FormField label={buyerType === "WalkIn" ? t("Buyer's name") : buyerType === "Staff" ? t("Staff member") : t("Student")} required error={errors.buyer}>
          {buyerType === "WalkIn" ? (
            <Input value={buyerName} onChange={(e) => setBuyerName(e.target.value)} aria-label={t("Buyer's name")} maxLength={200} />
          ) : (
            <Combobox aria-label={t("Choose the buyer")} value={buyerId} options={people.options} placeholder={t("Choose")}
              onValueChange={(id) => { const o = people.options.find((x) => x.value === id); setBuyerId(id); setBuyerName(o?.label ?? ""); setBuyerDetail(people.detail[id] ?? ""); }} />
          )}
        </FormField>
      </div>
      <LinesEditor lines={lines} onChange={setLines} storeId={storeId} showStock showPrice priceLabel={t("Price")} showDiscount itemList={items}
        onItemPicked={(_l, item) => (item ? { price: item.sellingPrice == null ? "" : String(item.sellingPrice) } : {})} />
      {errors.lines && <p role="alert" className="text-xs text-destructive-strong">{errors.lines}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2 rounded-lg border border-border p-3">
          <div className="flex items-center justify-between"><p className="flex items-center gap-1 text-sm font-medium"><Wallet className="h-4 w-4" /> {t("Payment")}</p>
            <Button type="button" variant="outline" size="sm" disabled={total <= 0} onClick={() => setPayments([{ key: Date.now(), amount: String(total), method: "Cash", reference: "" }])}>{t("Paid in full by cash")}</Button></div>
          {payments.map((p) => (
            <div key={p.key} className="grid items-center gap-2 sm:grid-cols-[7rem_9rem_1fr_auto]">
              <Input inputMode="decimal" aria-label={t("Amount")} value={p.amount} onChange={(e) => setPayments(payments.map((x) => (x.key === p.key ? { ...x, amount: e.target.value } : x)))} />
              <SelectField value={p.method} onChange={(v) => setPayments(payments.map((x) => (x.key === p.key ? { ...x, method: v ?? "Cash" } : x)))} items={options(PAYMENT_LABEL)} />
              <Input aria-label={t("Reference")} placeholder={t("Reference (optional)")} value={p.reference} onChange={(e) => setPayments(payments.map((x) => (x.key === p.key ? { ...x, reference: e.target.value } : x)))} />
              <Button type="button" variant="ghost" size="icon" aria-label={t("Remove payment")} onClick={() => setPayments(payments.filter((x) => x.key !== p.key))}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setPayments([...payments, { key: Date.now() + payments.length, amount: "", method: "Cash", reference: "" }])}><Plus className="h-4 w-4" /> {t("Add payment")}</Button>
          <p className="text-xs text-muted-foreground">{t("Leave empty to record the sale as unpaid and collect later.")}</p>
          {errors.payments && <p role="alert" className="text-xs text-destructive-strong">{errors.payments}</p>}
        </div>
        <div className="space-y-1 rounded-lg border border-border p-3 text-sm tabular-nums">
          <div className="flex justify-between"><span>{t("Subtotal")}</span><span>{money(subtotal)}</span></div>
          <div className="flex justify-between"><span>{t("Discount")}</span><span>-{money(discountTotal)}</span></div>
          <div className="flex justify-between"><span>{t("Tax")}</span><span>{money(taxTotal)}</span></div>
          <div className="flex justify-between border-t pt-1 text-lg font-semibold"><span>{t("Total")}</span><span>{money(total)}</span></div>
          <div className="flex justify-between"><span>{t("Paid now")}</span><span>{money(paid)}</span></div>
          <div className="flex justify-between font-medium"><span>{t("Balance")}</span><span>{money(Math.max(0, total - paid))}</span></div>
        </div>
      </div>
      <FormField label={t("Notes")} htmlFor="sale-notes" optional><Input id="sale-notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
    </FormDialog>
  );
}

function ReceiptDialog({ sale, onClose }: { sale: Sale | null; onClose: () => void }) {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("Cash");
  const [reference, setReference] = useState("");
  const pay = useApiMutation(() => paySale(sale!.id, { amount: amount.trim() === "" ? sale!.balance : toNumber(amount), method, paymentReference: reference.trim() || undefined }), { success: "Payment recorded", invalidate: [["store"]], onSuccess: () => { setAmount(""); setReference(""); onClose(); } });
  const s = sale;
  return (
    <PrintableDialog open={s !== null} onOpenChange={(v) => !v && onClose()} title={s ? t("Receipt {{ref}}", { ref: s.reference }) : ""}>
      {s && (
        <>
          <SummaryGrid>
            <Field label={t("Receipt")}>{s.reference}</Field>
            <Field label={t("Date")}>{formatDateTime(s.soldAt)}</Field>
            <Field label={t("Status")}><StatusBadge status={s.paymentStatus} label={t(SALE_STATUS_LABEL[s.paymentStatus])} /></Field>
            <Field label={t("Buyer")}>{s.buyerName}</Field>
            <Field label={t("Class / detail")}>{s.buyerDetail}</Field>
            <Field label={t("Sold by")}>{s.soldBy}</Field>
          </SummaryGrid>
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left"><th className="py-1">{t("Item")}</th><th className="py-1 text-right">{t("Qty")}</th><th className="py-1 text-right">{t("Price")}</th><th className="py-1 text-right">{t("Disc. %")}</th><th className="py-1 text-right">{t("Tax %")}</th><th className="py-1 text-right">{t("Amount")}</th></tr></thead>
            <tbody>{s.lines.map((l) => <tr key={l.id} className="border-b"><td className="py-1">{l.itemName}</td><td className="py-1 text-right tabular-nums">{qty(l.quantity)}</td><td className="py-1 text-right tabular-nums">{money(l.unitPrice)}</td><td className="py-1 text-right tabular-nums">{l.discountPercent}</td><td className="py-1 text-right tabular-nums">{l.taxPercent}</td><td className="py-1 text-right tabular-nums">{money(l.lineTotal)}</td></tr>)}</tbody>
          </table>
          <div className="ml-auto w-60 space-y-0.5 text-sm tabular-nums">
            <div className="flex justify-between"><span>{t("Subtotal")}</span><span>{money(s.subtotal)}</span></div>
            <div className="flex justify-between"><span>{t("Discount")}</span><span>-{money(s.discountTotal)}</span></div>
            <div className="flex justify-between"><span>{t("Tax")}</span><span>{money(s.taxTotal)}</span></div>
            <div className="flex justify-between border-t pt-1 text-base font-semibold"><span>{t("Total")}</span><span>{money(s.total)}</span></div>
            <div className="flex justify-between"><span>{t("Paid")}</span><span>{money(s.paidAmount)}</span></div>
            <div className="flex justify-between font-medium"><span>{t("Balance due")}</span><span>{money(s.balance)}</span></div>
          </div>
          {s.payments.length > 0 && <div className="text-xs text-muted-foreground">{s.payments.map((p) => <p key={p.id}>{formatDateTime(p.paidAt)} · {t(PAYMENT_LABEL[p.method])}{p.paymentReference ? ` (${p.paymentReference})` : ""} · {money(p.amount)}</p>)}</div>}
          {s.balance > 0 && access.sell && (
            <div className="store-no-print grid gap-2 rounded-lg border border-border p-3 sm:grid-cols-4">
              <Input inputMode="decimal" aria-label={t("Amount")} placeholder={String(s.balance)} value={amount} onChange={(e) => setAmount(e.target.value)} />
              <SelectField value={method} onChange={(v) => setMethod(v ?? "Cash")} items={options(PAYMENT_LABEL)} />
              <Input aria-label={t("Reference")} placeholder={t("Reference")} value={reference} onChange={(e) => setReference(e.target.value)} />
              <Button disabled={pay.isPending || (amount.trim() !== "" && (toNumber(amount) <= 0 || toNumber(amount) > s.balance))} onClick={() => pay.mutate(undefined)}>{t("Collect payment")}</Button>
            </div>
          )}
        </>
      )}
    </PrintableDialog>
  );
}

export default function SalesPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SalePaymentStatus | undefined>();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const paging = usePageState(15);
  // The header's New Sale button arrives here as ?new=1 and opens the form straight away.
  const [params, setParams] = useSearchParams();
  const [formOpenState, setFormOpenState] = useState(false);
  const formOpen = formOpenState || (params.get("new") === "1" && access.sell);
  const setFormOpen = (open: boolean) => {
    setFormOpenState(open);
    if (!open && params.has("new")) {
      const next = new URLSearchParams(params);
      next.delete("new");
      setParams(next, { replace: true });
    }
  };
  const [viewing, setViewing] = useState<Sale | null>(null);
  const filters = { search: search.trim() || undefined, status, from: from || undefined, to: to || undefined, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const query = useQuery({ queryKey: ["store", "sales", filters], queryFn: () => listSales(filters), placeholderData: (p) => p });
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); paging.reset(); };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={reset(setSearch)} placeholder={t("Search by receipt number or buyer")} aria-label={t("Search sales")} /></div>
        <div className="w-44"><SelectField value={status} onChange={reset(setStatus)} allLabel={t("Any payment status")} items={options(SALE_STATUS_LABEL)} /></div>
        <div className="w-40"><Input type="date" aria-label={t("From")} value={from} onChange={(e) => reset(setFrom)(e.target.value)} /></div>
        <div className="w-40"><Input type="date" aria-label={t("To")} value={to} min={from || undefined} onChange={(e) => reset(setTo)(e.target.value)} /></div>
        {access.sell && <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> {t("New sale")}</Button>}
      </div>
      <PagedTable
        query={query}
        rowKey={(s) => s.id}
        onRowClick={setViewing}
        pageIndex={paging.pageIndex}
        onPageChange={paging.setPageIndex}
        pageSize={paging.pageSize}
        emptyTitle={t("No sales yet")}
        emptyAction={access.sell ? <Button onClick={() => setFormOpen(true)}><Plus className="h-4 w-4" /> {t("New sale")}</Button> : undefined}
        columns={[
          { header: "Receipt", cell: (s) => <span className="font-medium">{s.reference}</span> },
          { header: "Date", cell: (s) => formatDate(s.soldAt) },
          { header: "Buyer", cell: (s) => <div><p>{s.buyerName}</p><p className="text-xs text-muted-foreground">{s.buyerDetail ?? t(BUYER_LABEL[s.buyerType])}</p></div> },
          { header: "Items", cell: (s) => s.lines.map((l) => `${l.itemName} × ${qty(l.quantity)}`).join(", ") },
          { header: "Total", align: "right", cell: (s) => money(s.total) },
          { header: "Paid", align: "right", cell: (s) => money(s.paidAmount) },
          { header: "Balance", align: "right", cell: (s) => money(s.balance) },
          { header: "Payment", cell: (s) => <StatusBadge status={s.paymentStatus} label={t(SALE_STATUS_LABEL[s.paymentStatus])} /> },
        ]}
      />
      <SaleForm open={formOpen} onOpenChange={setFormOpen} onSold={setViewing} />
      <ReceiptDialog sale={viewing} onClose={() => setViewing(null)} />
    </div>
  );
}
