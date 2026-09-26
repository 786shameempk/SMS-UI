import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { listFeeInvoices, payFeeInvoice } from "../api";
import type { FeeInvoice, FeeInvoiceStatus } from "../types";
import OnlinePaymentDialog from "./OnlinePaymentDialog";

const STATUS_CONFIG: Record<FeeInvoiceStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  paid: { label: "Paid", variant: "success" },
  due: { label: "Due", variant: "warning" },
  overdue: { label: "Overdue", variant: "danger" },
  partial: { label: "Partially paid", variant: "warning" },
};

export default function FeesTab({ studentId }: { studentId: string }) {
  const queryClient = useQueryClient();
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["parent-portal", "fees", studentId],
    queryFn: () => listFeeInvoices(studentId),
  });
  const [payTarget, setPayTarget] = useState<FeeInvoice | null>(null);

  const payMutation = useMutation({
    mutationFn: (invoiceId: string) => payFeeInvoice(studentId, invoiceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-portal", "fees", studentId] });
      toast.success(`Payment successful for ${payTarget?.term}`);
      setPayTarget(null);
    },
    onError: () => toast.error("Payment failed, please try again"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Fee payments</CardTitle>
        <CardDescription>Term-wise fee invoices and online payment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {isLoading && <p className="text-sm text-muted-foreground">Loading invoices…</p>}
        {invoices.map((invoice) => {
          const config = STATUS_CONFIG[invoice.status];
          return (
            <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-border p-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{invoice.term}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(invoice.amount)} &middot;{" "}
                  {invoice.status === "paid"
                    ? `Paid on ${new Date(invoice.paidOn!).toLocaleDateString()}`
                    : `Due ${new Date(invoice.dueDate).toLocaleDateString()}`}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={config.variant}>{config.label}</Badge>
                {invoice.status !== "paid" && (
                  <Button size="sm" onClick={() => setPayTarget(invoice)}>
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay online
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>

      <OnlinePaymentDialog
        open={Boolean(payTarget)}
        onOpenChange={(v) => !v && setPayTarget(null)}
        invoice={payTarget}
        submitting={payMutation.isPending}
        onPay={async () => {
          if (payTarget) await payMutation.mutateAsync(payTarget.id);
        }}
      />
    </Card>
  );
}
