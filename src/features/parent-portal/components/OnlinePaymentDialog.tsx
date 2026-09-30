import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/format";
import type { FeeInvoice } from "../types";

/**
 * Confirm step before Razorpay's checkout opens. School Sphere never asks for card or UPI details itself - they're
 * entered on Razorpay's secure form, and the school confirms the payment with Razorpay before marking it paid.
 */
export default function OnlinePaymentDialog({
  open,
  onOpenChange,
  invoice,
  onPay,
  submitting,
  enabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: FeeInvoice | null;
  onPay: () => Promise<void>;
  submitting: boolean;
  /** False when the school hasn't set up online payment (no Razorpay keys). */
  enabled: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-text" />
            Pay {invoice ? invoice.term : ""} fee
          </DialogTitle>
          <DialogDescription>
            {invoice
              ? enabled
                ? `Amount due: ${formatCurrency(invoice.amount)}. You'll pay on Razorpay's secure page with UPI, card or netbanking.`
                : "Online payment isn't set up for this school yet. Please pay at the school office."
              : ""}
          </DialogDescription>
        </DialogHeader>

        {enabled && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            Your card and UPI details go only to Razorpay. The receipt appears here once the payment is confirmed.
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {enabled ? "Cancel" : "Close"}
          </Button>
          {enabled && (
            <Button type="button" loading={submitting} onClick={() => void onPay()}>
              {invoice ? `Continue to pay ${formatCurrency(invoice.amount)}` : "Continue"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
