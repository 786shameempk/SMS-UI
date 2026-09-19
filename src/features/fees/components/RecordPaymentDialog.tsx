import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/utils/format";
import { PAYMENT_MODE_OPTIONS } from "../constants";
import type { FeeInvoice, PaymentMode, RecordPaymentParams } from "../types";

const paymentSchema = z.object({
  mode: z.enum(PAYMENT_MODE_OPTIONS.map((o) => o.value) as [PaymentMode, ...PaymentMode[]]),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
});

type FormValues = z.infer<typeof paymentSchema>;

export default function RecordPaymentDialog({
  open,
  onOpenChange,
  invoice,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: FeeInvoice | null;
  submitting: boolean;
  onSubmit: (values: RecordPaymentParams) => Promise<void>;
}) {
  const remaining = invoice ? invoice.netAmount - (invoice.paidAmount ?? 0) : 0;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(paymentSchema), defaultValues: { mode: "cash", amount: 0 } });

  useEffect(() => {
    if (open) reset({ mode: "cash", amount: remaining });
  }, [open, remaining, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record payment</DialogTitle>
          <DialogDescription>
            {invoice ? `${invoice.term} · ${invoice.feeType} · Balance due: ${formatCurrency(remaining)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="pay-mode">Payment mode</Label>
            <Controller
              control={control}
              name="mode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="pay-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODE_OPTIONS.map((o) => (
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
            <Label htmlFor="pay-amount">Amount</Label>
            <Input id="pay-amount" type="number" step="1" min="1" {...register("amount")} />
            {errors.amount && <p className="text-xs text-red-600">{errors.amount.message}</p>}
            <p className="text-xs text-muted-foreground">Paying less than the balance marks the invoice as partially paid.</p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
