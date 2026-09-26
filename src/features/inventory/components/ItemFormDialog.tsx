import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ITEM_UNIT_OPTIONS } from "../constants";
import type { InventoryItem, InventoryItemFormValues, ItemCategory, ItemUnit } from "../types";

const itemSchema = z.object({
  code: z.string().min(1, "Item code is required"),
  name: z.string().min(1, "Name is required"),
  categoryId: z.string().min(1, "Select a category"),
  unit: z.enum(ITEM_UNIT_OPTIONS.map((o) => o.value) as [ItemUnit, ...ItemUnit[]]),
  unitCost: z.coerce.number().min(0, "Cost can't be negative"),
  reorderLevel: z.coerce.number().min(0, "Reorder level can't be negative"),
  location: z.string().optional(),
});

type FormValues = z.infer<typeof itemSchema>;

const emptyValues: FormValues = { code: "", name: "", categoryId: "", unit: "piece", unitCost: 0, reorderLevel: 0, location: "" };

export default function ItemFormDialog({
  open,
  onOpenChange,
  item,
  categories,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: InventoryItem | null;
  categories: ItemCategory[];
  submitting: boolean;
  onSubmit: (values: InventoryItemFormValues) => Promise<void>;
}) {
  const isEdit = Boolean(item);
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(itemSchema), defaultValues: emptyValues });

  useEffect(() => {
    if (!open) return;
    reset(
      item
        ? {
            code: item.code,
            name: item.name,
            categoryId: item.categoryId,
            unit: item.unit,
            unitCost: item.unitCost,
            reorderLevel: item.reorderLevel,
            location: item.location ?? "",
          }
        : emptyValues,
    );
  }, [open, item, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit item" : "New item"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Stock on hand can only change through a stock-in, issue, or adjustment — not here."
              : "New items start at zero stock — record a purchase afterwards to bring in opening stock."}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => onSubmit({ ...values, location: values.location?.trim() || undefined }))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-code" required>Code</Label>
              <Input id="item-code" placeholder="e.g. STA-004" aria-invalid={errors.code ? true : undefined} {...register("code")} />
              {errors.code && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.code.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-category">Category</Label>
              <Controller
                control={control}
                name="categoryId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="item-category">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.categoryId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.categoryId.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-name" required>Name</Label>
            <Input id="item-name" placeholder="e.g. A4 Paper Ream" aria-invalid={errors.name ? true : undefined} {...register("name")} />
            {errors.name && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.name.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="item-unit" required>Unit</Label>
              <Controller
                control={control}
                name="unit"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="item-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ITEM_UNIT_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-unitCost" required>Unit cost</Label>
              <Input id="item-unitCost" type="number" min="0" step="1" aria-invalid={errors.unitCost ? true : undefined} {...register("unitCost")} />
              {errors.unitCost && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.unitCost.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="item-reorderLevel" required>Reorder level</Label>
              <Input id="item-reorderLevel" type="number" min="0" step="1" aria-invalid={errors.reorderLevel ? true : undefined} {...register("reorderLevel")} />
              {errors.reorderLevel && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.reorderLevel.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="item-location" optional>Storage location</Label>
            <Input id="item-location" placeholder="e.g. Store Room A" {...register("location")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? "Save changes" : "Create item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
