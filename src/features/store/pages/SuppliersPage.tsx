import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { History, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createSupplier, deleteSupplier, listInvoices, listPurchaseOrders, listSuppliers, updateSupplier } from "../api";
import FormDialog from "../components/FormDialog";
import { INVOICE_STATUS_LABEL, PO_STATUS_LABEL } from "../constants";
import { Field, PagedTable, SelectField, SummaryGrid, formatDate, money, optional, useApiMutation, usePageState, useStoreAccess } from "../shared";
import type { Supplier } from "../types";

interface FormState { name: string; contactPerson: string; email: string; phone: string; address: string; taxNumber: string; paymentTerms: string; paymentDueDays: string; bankDetails: string; isActive: boolean }
const blank: FormState = { name: "", contactPerson: "", email: "", phone: "", address: "", taxNumber: "", paymentTerms: "", paymentDueDays: "30", bankDetails: "", isActive: true };

function SupplierForm({ open, onOpenChange, supplier }: { open: boolean; onOpenChange: (v: boolean) => void; supplier: Supplier | null }) {
  const { t } = useTranslation("store");
  const [form, setForm] = useState<FormState>(blank);
  const [seeded, setSeeded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = open ? (supplier?.id ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) {
      setForm(supplier ? { name: supplier.name, contactPerson: supplier.contactPerson ?? "", email: supplier.email ?? "", phone: supplier.phone ?? "", address: supplier.address ?? "", taxNumber: supplier.taxNumber ?? "", paymentTerms: supplier.paymentTerms ?? "", paymentDueDays: String(supplier.paymentDueDays), bankDetails: supplier.bankDetails ?? "", isActive: supplier.isActive } : blank);
      setErrors({});
    }
  }
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const save = useApiMutation(
    () => {
      const body = { name: form.name.trim(), contactPerson: optional(form.contactPerson), email: optional(form.email), phone: optional(form.phone), address: optional(form.address), taxNumber: optional(form.taxNumber),
        paymentTerms: optional(form.paymentTerms), paymentDueDays: Math.round(Number(form.paymentDueDays) || 0), bankDetails: optional(form.bankDetails), isActive: form.isActive };
      return supplier ? updateSupplier(supplier.id, body) : createSupplier(body);
    },
    { success: () => (supplier ? "Supplier saved" : "Supplier added"), invalidate: [["store", "suppliers"]], onSuccess: () => onOpenChange(false) },
  );
  const submit = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = t("Enter the supplier's name");
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = t("Enter a valid email address");
    const days = Number(form.paymentDueDays);
    if (Number.isNaN(days) || days < 0 || days > 365) next.paymentDueDays = t("Between 0 and 365 days");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(undefined);
  };
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={supplier ? t("Edit supplier") : t("New supplier")} submitLabel={supplier ? t("Save changes") : t("Add supplier")} submitting={save.isPending} onSubmit={submit} size="lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label={t("Supplier name")} htmlFor="sup-name" required error={errors.name} className="sm:col-span-2"><Input id="sup-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={200} /></FormField>
        <FormField label={t("Contact person")} htmlFor="sup-contact" optional><Input id="sup-contact" value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} /></FormField>
        <FormField label={t("Phone")} htmlFor="sup-phone" optional><Input id="sup-phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} inputMode="tel" /></FormField>
        <FormField label={t("Email")} htmlFor="sup-email" optional error={errors.email}><Input id="sup-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></FormField>
        <FormField label={t("GST / tax number")} htmlFor="sup-tax" optional><Input id="sup-tax" value={form.taxNumber} onChange={(e) => set("taxNumber", e.target.value.toUpperCase())} maxLength={50} /></FormField>
        <FormField label={t("Address")} htmlFor="sup-address" optional className="sm:col-span-2"><Textarea id="sup-address" value={form.address} onChange={(e) => set("address", e.target.value)} rows={2} /></FormField>
        <FormField label={t("Payment terms")} htmlFor="sup-terms" optional><Input id="sup-terms" value={form.paymentTerms} onChange={(e) => set("paymentTerms", e.target.value)} placeholder={t("Net 30")} /></FormField>
        <FormField label={t("Payment due after (days)")} htmlFor="sup-days" error={errors.paymentDueDays}><Input id="sup-days" inputMode="numeric" value={form.paymentDueDays} onChange={(e) => set("paymentDueDays", e.target.value)} /></FormField>
        <FormField label={t("Bank details")} htmlFor="sup-bank" optional className="sm:col-span-2"><Textarea id="sup-bank" value={form.bankDetails} onChange={(e) => set("bankDetails", e.target.value)} rows={2} placeholder={t("Account name, number, IFSC")} /></FormField>
      </div>
      <div className="flex items-center gap-2"><Switch id="sup-active" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} /><label htmlFor="sup-active" className="text-sm">{t("Active (can be ordered from)")}</label></div>
    </FormDialog>
  );
}

function SupplierHistory({ supplier, onClose }: { supplier: Supplier | null; onClose: () => void }) {
  const { t } = useTranslation("store");
  const orders = useQuery({ queryKey: ["store", "purchase-orders", "supplier", supplier?.id], queryFn: () => listPurchaseOrders({ supplierId: supplier!.id, pageSize: 50 }), enabled: supplier !== null });
  const invoices = useQuery({ queryKey: ["store", "invoices", "supplier", supplier?.id], queryFn: () => listInvoices({ supplierId: supplier!.id, pageSize: 50 }), enabled: supplier !== null });
  return (
    <Dialog open={supplier !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-3xl">
        <DialogHeader><DialogTitle>{supplier?.name}</DialogTitle><DialogDescription>{t("Purchase history")}</DialogDescription></DialogHeader>
        {supplier && (
          <div className="max-h-[65vh] space-y-4 overflow-y-auto">
            <SummaryGrid>
              <Field label={t("Contact")}>{[supplier.contactPerson, supplier.phone, supplier.email].filter(Boolean).join(" · ") || "—"}</Field>
              <Field label={t("GST / tax number")}>{supplier.taxNumber ?? "—"}</Field>
              <Field label={t("Payment terms")}>{supplier.paymentTerms ?? `${supplier.paymentDueDays} days`}</Field>
              <Field label={t("Ordered in total")}>{money(supplier.totalPurchased)}</Field>
              <Field label={t("Still owed")}>{money(supplier.outstanding)}</Field>
              <Field label={t("Status")}><StatusBadge status={supplier.isActive ? "active" : "inactive"} /></Field>
            </SummaryGrid>
            {supplier.bankDetails && <Field label={t("Bank details")}>{supplier.bankDetails}</Field>}
            <div>
              <p className="mb-1 text-sm font-medium">{t("Purchase orders")}</p>
              {(orders.data?.items ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("No orders yet.")}</p>}
              {(orders.data?.items ?? []).map((o) => <div key={o.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm"><span>{o.reference} · {formatDate(o.orderDate)}</span><span className="flex items-center gap-2"><span className="tabular-nums">{money(o.total)}</span><StatusBadge status={o.status} label={t(PO_STATUS_LABEL[o.status])} /></span></div>)}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">{t("Invoices and payments")}</p>
              {(invoices.data?.items ?? []).length === 0 && <p className="text-sm text-muted-foreground">{t("No invoices yet.")}</p>}
              {(invoices.data?.items ?? []).map((i) => <div key={i.id} className="flex items-center justify-between gap-2 border-b border-border py-1.5 text-sm"><span>{i.invoiceNumber} · {t("due {{date}}", { date: formatDate(i.dueDate) })}</span><span className="flex items-center gap-2"><span className="tabular-nums">{money(i.paidAmount)} / {money(i.amount)}</span><StatusBadge status={i.overdue ? "overdue" : i.status} label={i.overdue ? t("Overdue") : t(INVOICE_STATUS_LABEL[i.status])} /></span></div>)}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function SuppliersPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<string | undefined>();
  const paging = usePageState(15);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [history, setHistory] = useState<Supplier | null>(null);
  const [removing, setRemoving] = useState<Supplier | null>(null);
  const filters = { search: search.trim() || undefined, active: active === undefined ? undefined : active === "yes", pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const suppliers = useQuery({ queryKey: ["store", "suppliers", filters], queryFn: () => listSuppliers(filters), placeholderData: (p) => p });
  const remove = useApiMutation(deleteSupplier, { success: (r) => (r.removed ? "Supplier deleted" : "This supplier has history, so it was made inactive instead"), onSuccess: () => setRemoving(null), invalidate: [["store", "suppliers"]] });
  const open = (s: Supplier | null) => { setEditing(s); setFormOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={(v) => { setSearch(v); paging.reset(); }} placeholder={t("Search by name, contact, phone or GST")} aria-label={t("Search suppliers")} /></div>
        <div className="w-36"><SelectField value={active} onChange={(v) => { setActive(v); paging.reset(); }} allLabel={t("Any status")} items={[{ value: "yes", label: "Active" }, { value: "no", label: "Inactive" }]} /></div>
        {access.create && <Button onClick={() => open(null)}><Plus className="h-4 w-4" /> {t("New supplier")}</Button>}
      </div>
      <PagedTable
        query={suppliers}
        rowKey={(s) => s.id}
        onRowClick={setHistory}
        pageIndex={paging.pageIndex}
        onPageChange={paging.setPageIndex}
        pageSize={paging.pageSize}
        emptyTitle={t("No suppliers yet")}
        emptyAction={access.create ? <Button onClick={() => open(null)}><Plus className="h-4 w-4" /> {t("New supplier")}</Button> : undefined}
        columns={[
          { header: "Supplier", cell: (s) => <div><p className="font-medium">{s.name}</p><p className="text-xs text-muted-foreground">{s.contactPerson ?? ""}</p></div> },
          { header: "Contact", cell: (s) => <div><p>{s.phone ?? "—"}</p><p className="text-xs text-muted-foreground">{s.email ?? ""}</p></div> },
          { header: "GST", cell: (s) => s.taxNumber ?? "—" },
          { header: "Terms", cell: (s) => s.paymentTerms ?? `${s.paymentDueDays} days` },
          { header: "Ordered", align: "right", cell: (s) => money(s.totalPurchased) },
          { header: "Owed", align: "right", cell: (s) => <span className={s.outstanding > 0 ? "text-destructive-strong" : undefined}>{money(s.outstanding)}</span> },
          { header: "Status", cell: (s) => <StatusBadge status={s.isActive ? "active" : "inactive"} /> },
          {
            header: "Actions",
            cell: (s) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button size="icon" variant="ghost" aria-label={t("History of {{name}}", { name: s.name })} onClick={() => setHistory(s)}><History className="h-4 w-4" /></Button>
                {access.edit && <Button size="icon" variant="ghost" aria-label={t("Edit {{name}}", { name: s.name })} onClick={() => open(s)}><Pencil className="h-4 w-4" /></Button>}
                {access.remove && <Button size="icon" variant="ghost" aria-label={t("Delete {{name}}", { name: s.name })} onClick={() => setRemoving(s)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ),
          },
        ]}
      />
      <SupplierForm open={formOpen} onOpenChange={setFormOpen} supplier={editing} />
      <SupplierHistory supplier={history} onClose={() => setHistory(null)} />
      <ConfirmDialog open={removing !== null} onOpenChange={(v) => !v && setRemoving(null)} title={t("Delete this supplier?")} description={t("{{name}} is deleted if there is no history; otherwise it is made inactive.", { name: removing?.name })}
        confirmLabel={t("Delete")} confirmVariant="destructive" submitting={remove.isPending} onConfirm={() => { if (removing) remove.mutate(removing.id); }} />
    </div>
  );
}
