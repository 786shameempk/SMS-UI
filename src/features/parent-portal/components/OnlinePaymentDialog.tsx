import { useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/format";
import type { FeeInvoice } from "../types";

export default function OnlinePaymentDialog({
  open,
  onOpenChange,
  invoice,
  onPay,
  submitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: FeeInvoice | null;
  onPay: () => Promise<void>;
  submitting: boolean;
}) {
  const [cardNumber, setCardNumber] = useState("4242 4242 4242 4242");
  const [expiry, setExpiry] = useState("12/28");
  const [cvv, setCvv] = useState("123");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-text" />
            Pay {invoice ? invoice.term : ""} fee
          </DialogTitle>
          <DialogDescription>
            {invoice ? `Amount due: ${formatCurrency(invoice.amount)}. This is a simulated payment for demo purposes.` : ""}
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={async (e) => {
            e.preventDefault();
            await onPay();
          }}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label htmlFor="cardNumber">Card number</Label>
            <Input id="cardNumber" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="expiry">Expiry</Label>
              <Input id="expiry" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="cvv">CVV</Label>
              <Input id="cvv" value={cvv} onChange={(e) => setCvv(e.target.value)} />
            </div>
          </div>
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            No real payment is processed — this form is a demo only.
          </p>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button type="submit" loading={submitting}>
              {invoice ? `Pay ${formatCurrency(invoice.amount)}` : "Pay"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
