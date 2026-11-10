import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { SearchInput } from "@/components/ui/search-input";
import { StatusBadge } from "@/components/ui/status-badge";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createItem, deleteItem, getItem, listItems, listSuppliers, updateItem } from "../api";
import FormDialog from "../components/FormDialog";
import { ITEM_KIND_LABEL, UNITS } from "../constants";
import { Field, PagedTable, SelectField, SummaryGrid, money, optional, options, qty, toNumber, useApiMutation, useCategories, usePageState, useStoreAccess } from "../shared";
import type { Item, ItemKind } from "../types";

interface FormState {
  name: string; sku: string; barcode: string; categoryId: string; subCategoryId: string; description: string; unit: string; brand: string; model: string; kind: ItemKind;
  minStock: string; reorderQuantity: string; maxStock: string; purchasePrice: string; sellingPrice: string; taxPercent: string; imageUrl: string; isActive: boolean;
  suppliers: { supplierId: string; price: string; isPreferred: boolean }[];
}

const blank: FormState = {
  name: "", sku: "", barcode: "", categoryId: "", subCategoryId: "", description: "", unit: "Nos", brand: "", model: "", kind: "Consumable", minStock: "", reorderQuantity: "", maxStock: "",
  purchasePrice: "", sellingPrice: "", taxPercent: "", imageUrl: "", isActive: true, suppliers: [],
};

const fromItem = (i: Item): FormState => ({
  name: i.name, sku: i.sku, barcode: i.barcode ?? "", categoryId: i.categoryId, subCategoryId: i.subCategoryId ?? "", description: i.description ?? "", unit: i.unit, brand: i.brand ?? "", model: i.model ?? "",
  kind: i.kind, minStock: String(i.minStock || ""), reorderQuantity: String(i.reorderQuantity || ""), maxStock: String(i.maxStock || ""), purchasePrice: String(i.purchasePrice || ""),
  sellingPrice: i.sellingPrice == null ? "" : String(i.sellingPrice), taxPercent: String(i.taxPercent || ""), imageUrl: i.imageUrl ?? "", isActive: i.isActive,
  suppliers: i.suppliers.map((s) => ({ supplierId: s.supplierId, price: s.price == null ? "" : String(s.price), isPreferred: s.isPreferred })),
});

function ItemForm({ open, onOpenChange, item }: { open: boolean; onOpenChange: (v: boolean) => void; item: Item | null }) {
  const { t } = useTranslation("store");
  const categories = useCategories();
  const suppliers = useQuery({ queryKey: ["store", "suppliers", "pick"], queryFn: () => listSuppliers({ active: true, pageSize: 200 }), enabled: open, staleTime: 60_000 });
  const [form, setForm] = useState<FormState>(blank);
  const [seeded, setSeeded] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const key = open ? (item?.id ?? "new") : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) { setForm(item ? fromItem(item) : blank); setErrors({}); }
  }
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const mains = (categories.data ?? []).filter((c) => !c.parentId && (c.isActive || c.id === form.categoryId));
  const subs = (categories.data ?? []).filter((c) => c.parentId === form.categoryId && c.isActive);

  const save = useApiMutation(
    () => {
      const body = {
        name: form.name.trim(), sku: optional(form.sku), barcode: optional(form.barcode), categoryId: form.categoryId, subCategoryId: form.subCategoryId || null, description: optional(form.description),
        unit: form.unit.trim(), brand: optional(form.brand), model: optional(form.model), kind: form.kind, minStock: toNumber(form.minStock), reorderQuantity: toNumber(form.reorderQuantity),
        maxStock: toNumber(form.maxStock), purchasePrice: toNumber(form.purchasePrice), sellingPrice: form.sellingPrice.trim() === "" ? null : toNumber(form.sellingPrice), taxPercent: toNumber(form.taxPercent),
        imageUrl: optional(form.imageUrl), isActive: form.isActive,
        suppliers: form.suppliers.filter((s) => s.supplierId).map((s) => ({ supplierId: s.supplierId, price: s.price.trim() === "" ? null : toNumber(s.price), isPreferred: s.isPreferred })),
      };
      return item ? updateItem(item.id, body) : createItem(body);
    },
    { success: () => (item ? "Item saved" : "Item created"), invalidate: [["store", "items"], ["store", "item-catalogue"], ["store", "categories"]], onSuccess: () => onOpenChange(false) },
  );

  const submit = () => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = t("Enter the item name");
    if (!form.categoryId) next.categoryId = t("Choose a category");
    if (!form.unit.trim()) next.unit = t("Enter the unit");
    const min = toNumber(form.minStock), max = toNumber(form.maxStock);
    if (max > 0 && min > max) next.maxStock = t("The maximum cannot be below the minimum");
    if ([form.minStock, form.reorderQuantity, form.maxStock, form.purchasePrice, form.sellingPrice, form.taxPercent].some((v) => v.trim() !== "" && (Number.isNaN(Number(v)) || Number(v) < 0))) next.prices = t("Stock levels and prices must be numbers, zero or more");
    if (toNumber(form.taxPercent) > 100) next.taxPercent = t("Tax cannot be more than 100%");
    setErrors(next);
    if (Object.keys(next).length === 0) save.mutate(undefined);
  };

  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={item ? t("Edit item") : t("New item")} submitLabel={item ? t("Save changes") : t("Create item")} submitting={save.isPending} onSubmit={submit} size="xl">
      <div className="grid gap-4 md:grid-cols-3">
        <FormField label={t("Item name")} htmlFor="item-name" required error={errors.name} className="md:col-span-2"><Input id="item-name" value={form.name} onChange={(e) => set("name", e.target.value)} maxLength={200} /></FormField>
        <FormField label={t("Item code / SKU")} htmlFor="item-sku" optional hint={item ? undefined : t("Left empty, one is generated")}><Input id="item-sku" value={form.sku} onChange={(e) => set("sku", e.target.value.toUpperCase())} maxLength={60} /></FormField>
        <FormField label={t("Category")} required error={errors.categoryId}><SelectField value={form.categoryId || undefined} onChange={(v) => setForm((f) => ({ ...f, categoryId: v ?? "", subCategoryId: "" }))} items={mains.map((c) => ({ value: c.id, label: c.name }))} /></FormField>
        <FormField label={t("Subcategory")} optional><SelectField value={form.subCategoryId || undefined} onChange={(v) => set("subCategoryId", v ?? "")} allLabel={t("None")} items={subs.map((c) => ({ value: c.id, label: c.name }))} disabled={subs.length === 0} /></FormField>
        <FormField label={t("Barcode / QR value")} htmlFor="item-barcode" optional><Input id="item-barcode" value={form.barcode} onChange={(e) => set("barcode", e.target.value)} maxLength={100} /></FormField>
        <FormField label={t("Type")}><SelectField value={form.kind} onChange={(v) => set("kind", v ?? "Consumable")} items={options(ITEM_KIND_LABEL)} /></FormField>
        <FormField label={t("Unit")} htmlFor="item-unit" required error={errors.unit}>
          <Input id="item-unit" list="store-units" value={form.unit} onChange={(e) => set("unit", e.target.value)} maxLength={30} />
          <datalist id="store-units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
        </FormField>
        <FormField label={t("Brand")} htmlFor="item-brand" optional><Input id="item-brand" value={form.brand} onChange={(e) => set("brand", e.target.value)} /></FormField>
        <FormField label={t("Model")} htmlFor="item-model" optional><Input id="item-model" value={form.model} onChange={(e) => set("model", e.target.value)} /></FormField>
        <FormField label={t("Description")} htmlFor="item-desc" optional className="md:col-span-3"><Textarea id="item-desc" value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} /></FormField>
        <FormField label={t("Image link")} htmlFor="item-image" optional className="md:col-span-3"><Input id="item-image" value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://" /></FormField>
      </div>

      <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-3">
        <p className="text-sm font-medium sm:col-span-3">{t("Stock levels")}</p>
        <FormField label={t("Minimum level")} htmlFor="item-min" hint={t("An alert is raised at or below this")}><Input id="item-min" inputMode="decimal" value={form.minStock} onChange={(e) => set("minStock", e.target.value)} /></FormField>
        <FormField label={t("Reorder quantity")} htmlFor="item-reorder"><Input id="item-reorder" inputMode="decimal" value={form.reorderQuantity} onChange={(e) => set("reorderQuantity", e.target.value)} /></FormField>
        <FormField label={t("Maximum level")} htmlFor="item-max" error={errors.maxStock}><Input id="item-max" inputMode="decimal" value={form.maxStock} onChange={(e) => set("maxStock", e.target.value)} /></FormField>
      </div>

      <div className="grid gap-4 rounded-lg border border-border p-3 sm:grid-cols-3">
        <p className="text-sm font-medium sm:col-span-3">{t("Prices and tax")}</p>
        <FormField label={t("Default purchase price")} htmlFor="item-pp"><Input id="item-pp" inputMode="decimal" value={form.purchasePrice} onChange={(e) => set("purchasePrice", e.target.value)} /></FormField>
        <FormField label={t("Selling price")} htmlFor="item-sp" optional hint={t("Needed to sell it from the store")}><Input id="item-sp" inputMode="decimal" value={form.sellingPrice} onChange={(e) => set("sellingPrice", e.target.value)} /></FormField>
        <FormField label={t("Tax %")} htmlFor="item-tax" error={errors.taxPercent}><Input id="item-tax" inputMode="decimal" value={form.taxPercent} onChange={(e) => set("taxPercent", e.target.value)} /></FormField>
        {errors.prices && <p className="text-xs text-destructive-strong sm:col-span-3" role="alert">{errors.prices}</p>}
      </div>

      <div className="space-y-2 rounded-lg border border-border p-3">
        <p className="text-sm font-medium">{t("Suppliers")}</p>
        {form.suppliers.map((s, idx) => (
          <div key={idx} className="grid items-center gap-2 sm:grid-cols-[1fr_9rem_auto_auto]">
            <SelectField value={s.supplierId || undefined} onChange={(v) => set("suppliers", form.suppliers.map((x, i) => (i === idx ? { ...x, supplierId: v ?? "" } : x)))} items={(suppliers.data?.items ?? []).filter((x) => x.id === s.supplierId || !form.suppliers.some((y) => y.supplierId === x.id)).map((x) => ({ value: x.id, label: x.name }))} placeholder={t("Choose a supplier")} />
            <Input inputMode="decimal" aria-label={t("Supplier price")} placeholder={t("Price")} value={s.price} onChange={(e) => set("suppliers", form.suppliers.map((x, i) => (i === idx ? { ...x, price: e.target.value } : x)))} />
            <label className="flex items-center gap-1.5 text-xs"><Switch checked={s.isPreferred} onCheckedChange={(v) => set("suppliers", form.suppliers.map((x, i) => (i === idx ? { ...x, isPreferred: v } : x)))} aria-label={t("Preferred")} />{t("Preferred")}</label>
            <Button type="button" variant="ghost" size="icon" aria-label={t("Remove supplier")} onClick={() => set("suppliers", form.suppliers.filter((_, i) => i !== idx))}><Trash2 className="h-4 w-4" /></Button>
          </div>
        ))}
        <Button type="button" variant="outline" size="sm" onClick={() => set("suppliers", [...form.suppliers, { supplierId: "", price: "", isPreferred: form.suppliers.length === 0 }])}><Plus className="h-4 w-4" /> {t("Add supplier")}</Button>
      </div>

      <div className="flex items-center gap-2"><Switch id="item-active" checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} /><label htmlFor="item-active" className="text-sm">{t("Active (can be bought, issued and sold)")}</label></div>
    </FormDialog>
  );
}

function ItemDetail({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { t } = useTranslation("store");
  const query = useQuery({ queryKey: ["store", "item", id], queryFn: () => getItem(id!), enabled: id !== null });
  const i = query.data;
  return (
    <Dialog open={id !== null} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader><DialogTitle>{i?.name ?? t("Item")}</DialogTitle><DialogDescription>{i ? `${i.sku}${i.barcode ? ` · ${i.barcode}` : ""}` : t("Loading")}</DialogDescription></DialogHeader>
        {i && (
          <div className="max-h-[65vh] space-y-4 overflow-y-auto">
            <SummaryGrid>
              <Field label={t("Category")}>{[i.categoryName, i.subCategoryName].filter(Boolean).join(" / ")}</Field>
              <Field label={t("Type")}>{t(ITEM_KIND_LABEL[i.kind])}</Field>
              <Field label={t("Unit")}>{i.unit}</Field>
              <Field label={t("In stock")}>{qty(i.totalStock)} {i.unit}</Field>
              <Field label={t("Minimum / reorder / maximum")}>{qty(i.minStock)} / {qty(i.reorderQuantity)} / {qty(i.maxStock)}</Field>
              <Field label={t("Purchase / selling price")}>{money(i.purchasePrice)} / {i.sellingPrice == null ? "—" : money(i.sellingPrice)}</Field>
              <Field label={t("Tax")}>{i.taxPercent}%</Field>
              <Field label={t("Brand / model")}>{[i.brand, i.model].filter(Boolean).join(" ") || "—"}</Field>
              <Field label={t("Status")}><StatusBadge status={i.isActive ? "active" : "inactive"} /></Field>
            </SummaryGrid>
            {i.description && <p className="text-sm text-muted-foreground">{i.description}</p>}
            <div>
              <p className="mb-1 text-sm font-medium">{t("Stock by store")}</p>
              {(i.stock ?? []).length === 0 ? <p className="text-sm text-muted-foreground">{t("None in stock.")}</p> : (i.stock ?? []).map((s) => <div key={s.storeId} className="flex justify-between border-b border-border py-1 text-sm"><span>{s.storeName}</span><span className="tabular-nums">{qty(s.quantity)} {i.unit} · {money(s.quantity * s.averageCost)}</span></div>)}
            </div>
            <div>
              <p className="mb-1 text-sm font-medium">{t("Suppliers")}</p>
              {i.suppliers.length === 0 ? <p className="text-sm text-muted-foreground">{t("No supplier linked.")}</p> : i.suppliers.map((s) => <div key={s.supplierId} className="flex justify-between border-b border-border py-1 text-sm"><span>{s.supplierName} {s.isPreferred && <Badge variant="info">{t("Preferred")}</Badge>}</span><span className="tabular-nums">{s.price == null ? "—" : money(s.price)}</span></div>)}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function ItemsPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const categories = useCategories();
  const [params, setParams] = useSearchParams();
  const lowOnly = params.get("low") === "1";
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState<string | undefined>();
  const [kind, setKind] = useState<ItemKind | undefined>();
  const [active, setActive] = useState<string | undefined>();
  const paging = usePageState(15);
  const [editing, setEditing] = useState<Item | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [removing, setRemoving] = useState<Item | null>(null);
  const filters = { search: search.trim() || undefined, categoryId, kind, active: active === undefined ? undefined : active === "yes", lowOnly, pageNumber: paging.pageNumber, pageSize: paging.pageSize };
  const items = useQuery({ queryKey: ["store", "items", filters], queryFn: () => listItems(filters), placeholderData: (p) => p });
  const remove = useApiMutation(deleteItem, { success: (r) => (r.removed ? "Item deleted" : "This item has history, so it was made inactive instead"), onSuccess: () => setRemoving(null), invalidate: [["store", "items"], ["store", "item-catalogue"]] });
  const reset = <T,>(set: (v: T) => void) => (v: T) => { set(v); paging.reset(); };
  const open = (item: Item | null) => { setEditing(item); setFormOpen(true); };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-56 flex-1"><SearchInput value={search} onValueChange={reset(setSearch)} placeholder={t("Search by name, code, barcode or brand")} aria-label={t("Search items")} /></div>
        <div className="w-52"><SelectField value={categoryId} onChange={reset(setCategoryId)} allLabel={t("All categories")} items={(categories.data ?? []).filter((c) => !c.parentId || true).map((c) => ({ value: c.id, label: c.parentName ? `${c.parentName} / ${c.name}` : c.name }))} /></div>
        <div className="w-44"><SelectField value={kind} onChange={reset(setKind)} allLabel={t("Any type")} items={options(ITEM_KIND_LABEL)} /></div>
        <div className="w-36"><SelectField value={active} onChange={reset(setActive)} allLabel={t("Any status")} items={[{ value: "yes", label: "Active" }, { value: "no", label: "Inactive" }]} /></div>
        <Button variant={lowOnly ? "default" : "outline"} aria-pressed={lowOnly} onClick={() => { const next = new URLSearchParams(params); if (lowOnly) next.delete("low"); else next.set("low", "1"); setParams(next); paging.reset(); }}>{t("Low stock only")}</Button>
        {access.create && <Button onClick={() => open(null)}><Plus className="h-4 w-4" /> {t("New item")}</Button>}
      </div>
      <PagedTable
        query={items}
        rowKey={(i) => i.id}
        onRowClick={(i) => setViewing(i.id)}
        pageIndex={paging.pageIndex}
        onPageChange={paging.setPageIndex}
        pageSize={paging.pageSize}
        emptyTitle={t("No items match")}
        emptyDescription={access.create ? t("Try different filters, or add the first item.") : undefined}
        emptyAction={access.create ? <Button onClick={() => open(null)}><Plus className="h-4 w-4" /> {t("New item")}</Button> : undefined}
        columns={[
          { header: "Item", cell: (i) => <div><p className="font-medium">{i.name}</p><p className="text-xs text-muted-foreground">{i.sku}{i.brand ? ` · ${i.brand}` : ""}</p></div> },
          { header: "Category", cell: (i) => [i.categoryName, i.subCategoryName].filter(Boolean).join(" / ") },
          { header: "In stock", align: "right", cell: (i) => <span className={i.minStock > 0 && i.totalStock <= i.minStock ? "text-destructive-strong" : undefined}>{qty(i.totalStock)} {i.unit}</span> },
          { header: "Minimum", align: "right", cell: (i) => qty(i.minStock) },
          { header: "Purchase price", align: "right", cell: (i) => money(i.purchasePrice) },
          { header: "Selling price", align: "right", cell: (i) => (i.sellingPrice == null ? "—" : money(i.sellingPrice)) },
          { header: "Status", cell: (i) => <StatusBadge status={i.isActive ? "active" : "inactive"} /> },
          {
            header: "Actions",
            cell: (i) => (
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                {access.edit && <Button size="icon" variant="ghost" aria-label={t("Edit {{name}}", { name: i.name })} onClick={() => open(i)}><Pencil className="h-4 w-4" /></Button>}
                {access.remove && <Button size="icon" variant="ghost" aria-label={t("Delete {{name}}", { name: i.name })} onClick={() => setRemoving(i)}><Trash2 className="h-4 w-4" /></Button>}
              </div>
            ),
          },
        ]}
      />
      <ItemForm open={formOpen} onOpenChange={setFormOpen} item={editing} />
      <ItemDetail id={viewing} onClose={() => setViewing(null)} />
      <ConfirmDialog open={removing !== null} onOpenChange={(v) => !v && setRemoving(null)} title={t("Delete this item?")} description={t("{{name}} is deleted if it was never used; otherwise it is made inactive so its history stays.", { name: removing?.name })}
        confirmLabel={t("Delete")} confirmVariant="destructive" submitting={remove.isPending} onConfirm={() => { if (removing) remove.mutate(removing.id); }} />
    </div>
  );
}
