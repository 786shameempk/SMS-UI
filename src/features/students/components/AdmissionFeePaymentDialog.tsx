import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PAYMENT_MODE_OPTIONS } from "../constants";
import type { AdmissionApplication, AdmissionFeePaymentFormValues } from "../types";

const paymentSchema = z.object({
  amount: z.coerce.number().positive("Enter a valid amount"),
  paymentMode: z.string().min(1, "Select a payment mode"),
});

type FormValues = z.infer<typeof paymentSchema>;

export default function AdmissionFeePaymentDialog({
  open,
  onOpenChange,
  application,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  application: AdmissionApplication | null;
  submitting: boolean;
  onSubmit: (values: AdmissionFeePaymentFormValues) => Promise<void>;
}) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(paymentSchema) });

  useEffect(() => {
    if (open && application) reset({ amount: application.admissionFeeAmount ?? 0, paymentMode: "Cash" });
  }, [open, application, reset]);

  if (!application) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Record admission fee payment</DialogTitle>
          <DialogDescription>
            For {application.applicantFirstName} {application.applicantLastName} ({application.appliedClass}).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((values) => onSubmit(values))} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fee-amount" required>Amount</Label>
            <Input id="fee-amount" type="number" min="0" step="1" aria-invalid={errors.amount ? true : undefined} {...register("amount")} />
            {errors.amount && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.amount.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fee-mode">Payment mode</Label>
            <Controller
              control={control}
              name="paymentMode"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="fee-mode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_MODE_OPTIONS.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.paymentMode && <p data-slot="field-error" role="alert" className="text-xs text-destructive-strong">{errors.paymentMode.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              Record payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
