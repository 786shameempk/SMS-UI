import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/format";
import type { FeeInvoice, RefundFormValues } from "../types";

const refundSchema = z.object({
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  reason: z.string().min(1, "Reason is required"),
});

type FormValues = z.infer<typeof refundSchema>;

export default function RefundDialog({
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
  onSubmit: (values: RefundFormValues) => Promise<void>;
}) {
  const paidAmount = invoice?.paidAmount ?? 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(refundSchema), defaultValues: { amount: 0, reason: "" } });

  useEffect(() => {
    if (open) reset({ amount: paidAmount, reason: "" });
  }, [open, paidAmount, reset]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Request refund</DialogTitle>
          <DialogDescription>
            {invoice ? `${invoice.term} · ${invoice.feeType} · Paid so far: ${formatCurrency(paidAmount)}` : ""}
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit((values) => {
            if (!invoice) return;
            return onSubmit({ invoiceId: invoice.id, ...values });
          })}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="refund-amount" required>Amount</Label>
            <Input id="refund-amount" type="number" step="1" min="1" aria-invalid={errors.amount ? true : undefined} {...register("amount")} />
            {errors.amount && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.amount.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="refund-reason" required>Reason</Label>
            <Textarea id="refund-reason" rows={3} aria-invalid={errors.reason ? true : undefined} {...register("reason")} />
            {errors.reason && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.reason.message}</p>}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Submit refund request
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
