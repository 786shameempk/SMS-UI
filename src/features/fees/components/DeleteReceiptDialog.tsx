import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/utils/format";
import type { Receipt } from "../types";

export default function DeleteReceiptDialog({
  receipt,
  onOpenChange,
  onConfirm,
  submitting,
}: {
  receipt: Receipt | null;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void | Promise<void>;
  submitting: boolean;
}) {
  const [reason, setReason] = useState("");
  useEffect(() => {
    if (receipt) setReason("");
  }, [receipt]);

  const canSubmit = reason.trim().length > 0;
  return (
    <Dialog open={Boolean(receipt)} onOpenChange={(v) => !submitting && onOpenChange(v)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete payment</DialogTitle>
          <DialogDescription>
            {receipt
              ? `Receipt ${receipt.receiptNumber} for ${formatCurrency(receipt.amount)} will be removed and the invoice's paid amount and status recalculated. The receipt number is not reused.`
              : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="delete-receipt-reason" required>Reason</Label>
          <Textarea
            id="delete-receipt-reason"
            rows={3}
            maxLength={500}
            placeholder="e.g. Entered against the wrong student"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">Kept in the service log with your name. Online (gateway) payments can't be deleted; refund them instead.</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" disabled={!canSubmit} loading={submitting} onClick={() => onConfirm(reason.trim())}>
            Delete payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
