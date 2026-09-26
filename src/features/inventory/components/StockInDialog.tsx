import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryItem, StockInFormValues, Vendor } from "../types";

const stockInSchema = z.object({
  itemId: z.string().min(1, "Select an item"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  unitCost: z.coerce.number().min(0, "Cost can't be negative"),
  vendorId: z.string().optional(),
  date: z.string().min(1, "Date is required"),
  reference: z.string().optional(),
});

type FormValues = z.infer<typeof stockInSchema>;

const NO_VENDOR = "__none__";

function emptyValues(): FormValues {
  return { itemId: "", quantity: 1, unitCost: 0, vendorId: NO_VENDOR, date: new Date().toISOString().slice(0, 10), reference: "" };
}

export default function StockInDialog({
  open,
  onOpenChange,
  items,
  vendors,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  vendors: Vendor[];
  submitting: boolean;
  onSubmit: (values: StockInFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(stockInSchema), defaultValues: emptyValues() });

  useEffect(() => {
    if (open) reset(emptyValues());
  }, [open, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Stock in</DialogTitle>
          <DialogDescription>Record newly received stock — a purchase, donation, or restock.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) =>
            onSubmit({ ...values, vendorId: values.vendorId === NO_VENDOR ? undefined : values.vendorId, reference: values.reference?.trim() || undefined }),
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="si-itemId" required>Item</Label>
            <Controller
              control={control}
              name="itemId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    const item = items.find((i) => i.id === v);
                    if (item) setValue("unitCost", item.unitCost);
                  }}
                >
                  <SelectTrigger id="si-itemId">
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.code} · {i.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.itemId && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.itemId.message}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="si-quantity" required>Quantity</Label>
              <Input id="si-quantity" type="number" min="1" step="1" aria-invalid={errors.quantity ? true : undefined} {...register("quantity")} />
              {errors.quantity && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="si-unitCost" required>Unit cost</Label>
              <Input id="si-unitCost" type="number" min="0" step="1" aria-invalid={errors.unitCost ? true : undefined} {...register("unitCost")} />
              {errors.unitCost && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.unitCost.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="si-vendorId" optional>Vendor</Label>
              <Controller
                control={control}
                name="vendorId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="si-vendorId">
                      <SelectValue placeholder="Select vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_VENDOR}>No vendor</SelectItem>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="si-date" required>Date</Label>
              <Input id="si-date" type="date" aria-invalid={errors.date ? true : undefined} {...register("date")} />
              {errors.date && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.date.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="si-reference" optional>Reference</Label>
            <Input id="si-reference" placeholder="e.g. invoice or PO number" {...register("reference")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Record stock in
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
