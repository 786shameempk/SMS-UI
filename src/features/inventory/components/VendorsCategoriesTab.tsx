import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import {
  createCategory,
  createVendor,
  deleteCategory,
  deleteVendor,
  listCategories,
  listVendors,
  updateCategory,
  updateVendor,
} from "../api";
import type { ItemCategory, ItemCategoryFormValues, Vendor, VendorFormValues } from "../types";
import CategoryFormDialog from "./CategoryFormDialog";
import VendorFormDialog from "./VendorFormDialog";

export default function VendorsCategoriesTab() {
  const queryClient = useQueryClient();
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["inventory"] });

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({ queryKey: ["inventory", "categories"], queryFn: listCategories });
  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({ queryKey: ["inventory", "vendors"], queryFn: listVendors });

  const [categoryForm, setCategoryForm] = useState<{ open: boolean; editing: ItemCategory | null }>({ open: false, editing: null });
  const [vendorForm, setVendorForm] = useState<{ open: boolean; editing: Vendor | null }>({ open: false, editing: null });
  const [deleteTarget, setDeleteTarget] = useState<{ kind: "category" | "vendor"; item: ItemCategory | Vendor } | null>(null);

  const categoryCreate = useMutation({
    mutationFn: createCategory,
    onSuccess: () => {
      invalidate();
      toast.success("Category added");
      setCategoryForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add category"),
  });
  const categoryUpdate = useMutation({
    mutationFn: ({ id, values }: { id: string; values: ItemCategoryFormValues }) => updateCategory(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Category updated");
      setCategoryForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update category"),
  });

  const vendorCreate = useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      invalidate();
      toast.success("Vendor added");
      setVendorForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not add vendor"),
  });
  const vendorUpdate = useMutation({
    mutationFn: ({ id, values }: { id: string; values: VendorFormValues }) => updateVendor(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Vendor updated");
      setVendorForm({ open: false, editing: null });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not update vendor"),
  });

  const deleteMutation = useMutation({
    mutationFn: (target: NonNullable<typeof deleteTarget>) =>
      target.kind === "category" ? deleteCategory(target.item.id) : deleteVendor(target.item.id),
    onSuccess: () => {
      invalidate();
      toast.success("Deleted");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not delete"),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-4 flex-wrap lg:flex-nowrap items-start">
        <Card className="flex-1 min-w-[280px]">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Categories</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Groups used to organize items.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setCategoryForm({ open: true, editing: null })}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {categoriesLoading && <p className="text-sm text-muted-foreground py-2">Loading…</p>}
            {!categoriesLoading && categories.length === 0 && <p className="text-sm text-muted-foreground py-2">No categories yet.</p>}
            {!categoriesLoading &&
              categories.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{c.name}</p>
                    {c.description && <p className="text-xs text-muted-foreground truncate">{c.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setCategoryForm({ open: true, editing: c })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ kind: "category", item: c })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>

        <Card className="flex-1 min-w-[280px]">
          <CardHeader className="flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">Vendors</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Suppliers you purchase items from.</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => setVendorForm({ open: true, editing: null })}>
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {vendorsLoading && <p className="text-sm text-muted-foreground py-2">Loading…</p>}
            {!vendorsLoading && vendors.length === 0 && <p className="text-sm text-muted-foreground py-2">No vendors yet.</p>}
            {!vendorsLoading &&
              vendors.map((v) => (
                <div key={v.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2">
                  <div className="min-w-0">
                    <p className="text-sm text-foreground truncate">{v.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[v.contactPerson, v.phone].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setVendorForm({ open: true, editing: v })}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteTarget({ kind: "vendor", item: v })}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      </div>

      <CategoryFormDialog
        open={categoryForm.open}
        onOpenChange={(open) => setCategoryForm((s) => ({ open, editing: open ? s.editing : null }))}
        category={categoryForm.editing}
        submitting={categoryCreate.isPending || categoryUpdate.isPending}
        onSubmit={async (values) => {
          if (categoryForm.editing) await categoryUpdate.mutateAsync({ id: categoryForm.editing.id, values });
          else await categoryCreate.mutateAsync(values);
        }}
      />

      <VendorFormDialog
        open={vendorForm.open}
        onOpenChange={(open) => setVendorForm((s) => ({ open, editing: open ? s.editing : null }))}
        vendor={vendorForm.editing}
        submitting={vendorCreate.isPending || vendorUpdate.isPending}
        onSubmit={async (values) => {
          if (vendorForm.editing) await vendorUpdate.mutateAsync({ id: vendorForm.editing.id, values });
          else await vendorCreate.mutateAsync(values);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.kind ?? ""}`}
        description={`Delete "${deleteTarget?.item.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget);
        }}
      />
    </div>
  );
}
