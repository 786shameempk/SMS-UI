import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { InventoryItem, StockAdjustmentFormValues } from "../types";

const adjustmentSchema = z.object({
  itemId: z.string().min(1, "Select an item"),
  newQuantity: z.coerce.number().min(0, "Quantity can't be negative"),
  reason: z.string().min(1, "Explain the reason for this adjustment"),
  date: z.string().min(1, "Date is required"),
});

type FormValues = z.infer<typeof adjustmentSchema>;

function emptyValues(): FormValues {
  return { itemId: "", newQuantity: 0, reason: "", date: new Date().toISOString().slice(0, 10) };
}

export default function StockAdjustmentDialog({
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
  onSubmit: (values: StockAdjustmentFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(adjustmentSchema), defaultValues: emptyValues() });

  useEffect(() => {
    if (open) reset(emptyValues());
  }, [open, reset]);

  const itemId = watch("itemId");
  const newQuantity = watch("newQuantity");
  const selectedItem = items.find((i) => i.id === itemId);
  const delta = selectedItem ? Number(newQuantity) - selectedItem.quantityInStock : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adjust stock</DialogTitle>
          <DialogDescription>Correct the recorded quantity after a physical stock count, damage, or loss.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit({ ...values, reason: values.reason.trim() }))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="adj-itemId">Item</Label>
            <Controller
              control={control}
              name="itemId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    const item = items.find((i) => i.id === v);
                    if (item) setValue("newQuantity", item.quantityInStock);
                  }}
                >
                  <SelectTrigger id="adj-itemId">
                    <SelectValue placeholder="Select an item" />
                  </SelectTrigger>
                  <SelectContent>
                    {items.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.code} · {i.name} (currently {i.quantityInStock})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.itemId && <p className="text-xs text-red-600">{errors.itemId.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="adj-newQuantity">Counted quantity</Label>
              <Input id="adj-newQuantity" type="number" min="0" step="1" {...register("newQuantity")} />
              {errors.newQuantity && <p className="text-xs text-red-600">{errors.newQuantity.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="adj-date">Date</Label>
              <Input id="adj-date" type="date" {...register("date")} />
              {errors.date && <p className="text-xs text-red-600">{errors.date.message}</p>}
            </div>
          </div>

          {selectedItem && delta !== 0 && (
            <p className={`text-xs rounded-md border px-2.5 py-2 ${delta > 0 ? "border-green-200 bg-green-50 text-green-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}>
              {delta > 0 ? `+${delta}` : delta} {selectedItem.unit}(s) relative to the current recorded stock.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="adj-reason">Reason</Label>
            <Textarea id="adj-reason" rows={2} placeholder="e.g. Annual stock take — 2 units found damaged" {...register("reason")} />
            {errors.reason && <p className="text-xs text-red-600">{errors.reason.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Save adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
