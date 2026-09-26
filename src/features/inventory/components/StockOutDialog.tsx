import { useEffect, useMemo } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryItem, StockOutFormValues } from "../types";

const stockOutSchema = z.object({
  itemId: z.string().min(1, "Select an item"),
  quantity: z.coerce.number().positive("Quantity must be greater than zero"),
  issuedTo: z.string().min(1, "Enter who this is issued to"),
  reason: z.string().optional(),
  date: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof stockOutSchema>;

function emptyValues(): FormValues {
  return { itemId: "", quantity: 1, issuedTo: "", reason: "", date: new Date().toISOString().slice(0, 10) };
}

export default function StockOutDialog({
  open,
  onOpenChange,
  items,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: InventoryItem[];
  submitting: boolean;
  onSubmit: (values: StockOutFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(stockOutSchema), defaultValues: emptyValues() });

  useEffect(() => {
    if (open) reset(emptyValues());
  }, [open, reset]);

  const availableItems = useMemo(() => items.filter((i) => i.quantityInStock > 0), [items]);
  const itemId = watch("itemId");
  const selectedItem = items.find((i) => i.id === itemId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Issue stock</DialogTitle>
          <DialogDescription>Take items out of inventory for use by a department or class.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, issuedTo: values.issuedTo.trim(), reason: values.reason?.trim() || undefined }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="so-itemId" required>Item</Label>
            <Controller
              control={control}
              name="itemId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="so-itemId">
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableItems.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.code} · {i.name} ({i.quantityInStock} in stock)
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
              <Label htmlFor="so-quantity" required>Quantity</Label>
              <Input id="so-quantity" type="number" min="1" step="1" max={selectedItem?.quantityInStock} aria-invalid={errors.quantity ? true : undefined} {...register("quantity")} />
              {errors.quantity && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.quantity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="so-date" required>Date</Label>
              <Input id="so-date" type="date" aria-invalid={errors.date ? true : undefined} {...register("date")} />
              {errors.date && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.date.message}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="so-issuedTo" required>Issued to</Label>
            <Input id="so-issuedTo" placeholder="e.g. Science department, Grade 8 - A" aria-invalid={errors.issuedTo ? true : undefined} {...register("issuedTo")} />
            {errors.issuedTo && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.issuedTo.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="so-reason" optional>Purpose</Label>
            <Input id="so-reason" placeholder="e.g. Term 2 lab practicals" {...register("reason")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Issue stock
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
