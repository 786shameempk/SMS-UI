import { useState } from "react";
import { CornerDownRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { createCategory, deleteCategory, updateCategory } from "../api";
import FormDialog from "../components/FormDialog";
import { SelectField, optional, useApiMutation, useCategories, useStoreAccess } from "../shared";
import type { Category } from "../types";

function CategoryForm({ open, onOpenChange, category, parentId, parents }: { open: boolean; onOpenChange: (v: boolean) => void; category: Category | null; parentId?: string; parents: Category[] }) {
  const { t } = useTranslation("store");
  const [form, setForm] = useState({ name: "", description: "", isActive: true, parentId: undefined as string | undefined });
  const [seeded, setSeeded] = useState<string | null>(null);
  const [error, setError] = useState("");
  const key = open ? `${category?.id ?? "new"}:${parentId ?? ""}` : null;
  if (key !== seeded) {
    setSeeded(key);
    if (key) {
      setForm({ name: category?.name ?? "", description: category?.description ?? "", isActive: category?.isActive ?? true, parentId: category ? (category.parentId ?? undefined) : parentId });
      setError("");
    }
  }
  const save = useApiMutation(
    () => {
      const body = { name: form.name.trim(), description: optional(form.description), isActive: form.isActive, parentId: form.parentId ?? null };
      return category ? updateCategory(category.id, body) : createCategory(body);
    },
    { success: () => (category ? "Category saved" : "Category created"), invalidate: [["store", "categories"], ["store", "items"]], onSuccess: () => onOpenChange(false) },
  );
  return (
    <FormDialog open={open} onOpenChange={onOpenChange} title={category ? t("Edit category") : form.parentId ? t("New subcategory") : t("New category")} submitLabel={t("Save")} submitting={save.isPending}
      onSubmit={() => (form.name.trim() ? save.mutate(undefined) : setError(t("Enter a name")))}>
      <FormField label={t("Name")} htmlFor="cat-name" required error={error}>
        <Input id="cat-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={150} />
      </FormField>
      <FormField label={t("Parent category")} optional hint={t("Leave empty for a main category.")}>
        <SelectField value={form.parentId} onChange={(v) => setForm({ ...form, parentId: v })} allLabel={t("None - main category")} items={parents.filter((p) => p.id !== category?.id).map((p) => ({ value: p.id, label: p.name }))} disabled={Boolean(category && category.itemCount > 0 && !category.parentId)} />
      </FormField>
      <FormField label={t("Description")} htmlFor="cat-desc" optional>
        <Input id="cat-desc" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </FormField>
      <div className="flex items-center gap-2"><Switch id="cat-active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} /><label htmlFor="cat-active" className="text-sm">{t("Active")}</label></div>
    </FormDialog>
  );
}

export default function CategoriesPage() {
  const { t } = useTranslation("store");
  const access = useStoreAccess();
  const categories = useCategories();
  const [editing, setEditing] = useState<Category | null>(null);
  const [parentId, setParentId] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<Category | null>(null);
  const remove = useApiMutation(deleteCategory, { success: "Category deleted", invalidate: [["store", "categories"]], onSuccess: () => setRemoving(null) });
  const all = categories.data ?? [];
  const mains = all.filter((c) => !c.parentId);
  const show = (cat: Category | null, parent?: string) => { setEditing(cat); setParentId(parent); setOpen(true); };

  if (categories.isError) return <ErrorState onRetry={() => categories.refetch()} retrying={categories.isFetching} />;
  if (categories.isLoading) return <Skeleton className="h-64 w-full" />;

  const row = (c: Category, sub = false) => (
    <div key={c.id} className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-2.5 last:border-0">
      {sub && <CornerDownRight className="ml-4 h-4 w-4 text-muted-foreground" aria-hidden="true" />}
      <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
      <Badge variant="neutral">{t("{{count}} items", { count: c.itemCount })}</Badge>
      {!c.isActive && <Badge variant="neutral">{t("Inactive")}</Badge>}
      {access.create && !sub && <Button size="sm" variant="ghost" onClick={() => show(null, c.id)}><Plus className="h-3.5 w-3.5" /> {t("Subcategory")}</Button>}
      {access.edit && <Button size="icon" variant="ghost" aria-label={t("Edit {{name}}", { name: c.name })} onClick={() => show(c)}><Pencil className="h-4 w-4" /></Button>}
      {access.remove && <Button size="icon" variant="ghost" aria-label={t("Delete {{name}}", { name: c.name })} onClick={() => setRemoving(c)}><Trash2 className="h-4 w-4" /></Button>}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{t("Group items by what they are. Add subcategories where a category is too broad, such as uniforms by class.")}</p>
        {access.create && <Button onClick={() => show(null)}><Plus className="h-4 w-4" /> {t("New category")}</Button>}
      </div>
      <Card>{mains.map((m) => (<div key={m.id}>{row(m)}{all.filter((c) => c.parentId === m.id).map((c) => row(c, true))}</div>))}</Card>
      <CategoryForm open={open} onOpenChange={setOpen} category={editing} parentId={parentId} parents={mains} />
      <ConfirmDialog open={removing !== null} onOpenChange={(v) => !v && setRemoving(null)} title={t("Delete this category?")} description={t("{{name}} can only be deleted when no items use it and it has no subcategories.", { name: removing?.name })}
        confirmLabel={t("Delete")} confirmVariant="destructive" submitting={remove.isPending} onConfirm={() => { if (removing) remove.mutate(removing.id); }} />
    </div>
  );
}
