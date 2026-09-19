import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FeeDiscount, FeeInvoice } from "../types";

export default function ApplyDiscountDialog({
  open,
  onOpenChange,
  invoice,
  discounts,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: FeeInvoice | null;
  discounts: FeeDiscount[];
  submitting: boolean;
  onSubmit: (discountId: string) => Promise<void>;
}) {
  const [discountId, setDiscountId] = useState<string>("");

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) setDiscountId("");
      }}
    >
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Apply discount</DialogTitle>
          <DialogDescription>{invoice ? `${invoice.term} · ${invoice.feeType} invoice` : ""}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="apply-discount">Discount</Label>
            <Select value={discountId} onValueChange={setDiscountId}>
              <SelectTrigger id="apply-discount">
                <SelectValue placeholder="Select a discount" />
              </SelectTrigger>
              <SelectContent>
                {discounts.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name} ({d.type === "percentage" ? `${d.value}%` : `₹${d.value}`})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={submitting || !discountId}
              onClick={async () => {
                await onSubmit(discountId);
                setDiscountId("");
              }}
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Apply
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
