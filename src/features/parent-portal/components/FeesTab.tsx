import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/utils/format";
import { getPaymentConfig, type PayerDetails } from "@/features/fees/api";
import { useAuthStore } from "@/store/authStore";
import { listFeeInvoices, payFeeInvoice } from "../api";
import { completeReturnedPayment } from "../onlineCheckout";
import { CheckoutDismissed } from "../razorpayCheckout";
import type { FeeInvoice, FeeInvoiceStatus } from "../types";
import OnlinePaymentDialog from "./OnlinePaymentDialog";

import { useTranslation } from "react-i18next";
const STATUS_CONFIG: Record<FeeInvoiceStatus, { label: string; variant: "success" | "warning" | "danger" }> = {
  paid: { label: "Paid", variant: "success" },
  due: { label: "Due", variant: "warning" },
  overdue: { label: "Overdue", variant: "danger" },
  partial: { label: "Partially paid", variant: "warning" },
};

export default function FeesTab({ studentId }: { studentId: string }) {
  const { t } = useTranslation("parent-portal");
  const queryClient = useQueryClient();
  const { data: invoices = [], isLoading } = useQuery({
    queryKey: ["parent-portal", "fees", studentId],
    queryFn: () => listFeeInvoices(studentId),
  });
  const [payTarget, setPayTarget] = useState<FeeInvoice | null>(null);
  const user = useAuthStore((s) => s.user);
  const config = useQuery({ queryKey: ["payments", "config"], queryFn: getPaymentConfig, staleTime: 10 * 60_000 });

  // The payer is back from a gateway's page: ask FinanceService to confirm the order, then tidy the address bar.
  const returned = useRef(false);
  const [confirming, setConfirming] = useState(false);
  useEffect(() => {
    if (returned.current) return;
    const query = new URLSearchParams(window.location.search);
    if (query.get("payment") !== "return") return;
    returned.current = true;
    setConfirming(true);
    completeReturnedPayment(query)
      .then((result) => {
        if (result.kind === "paid") {
          void queryClient.invalidateQueries({ queryKey: ["parent-portal", "fees"] });
          toast.success(t("Payment received. Your receipt is ready."));
        } else if (result.kind === "cancelled") {
          toast(t("The payment was cancelled. Nothing was charged."));
        }
      })
      .catch((err: Error) => toast.error(err.message || t("We couldn't confirm the payment yet. If money was taken, it will be matched automatically."), { duration: 8000 }))
      .finally(() => {
        setConfirming(false);
        for (const key of ["payment", "gateway", "order", "cancelled"]) query.delete(key);
        const rest = query.toString();
        window.history.replaceState(null, "", `${window.location.pathname}${rest ? `?${rest}` : ""}`);
      });
  }, [queryClient]);

  const payMutation = useMutation({
    mutationFn: ({ provider, payer }: { provider: string; payer: PayerDetails }) => payFeeInvoice(studentId, payTarget!.id, provider, payer),
    onSuccess: (outcome) => {
      if (outcome.kind === "redirecting") return; // the page is going to the gateway
      queryClient.invalidateQueries({ queryKey: ["parent-portal", "fees", studentId] });
      toast.success(t("Payment received for {{term}}", { term: payTarget?.term }));
      setPayTarget(null);
    },
    onError: (err: Error) => {
      if (err instanceof CheckoutDismissed) return;
      toast.error(err.message || t("Payment failed, please try again"));
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Fee payments")}</CardTitle>
        <CardDescription>{t("Term-wise fee invoices and online payment.")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2.5">
        {confirming && <p className="rounded-lg border border-border bg-muted px-3 py-2 text-sm text-foreground" role="status">{t("Confirming your payment…")}</p>}
        {isLoading && <p className="text-sm text-muted-foreground">{t("Loading invoices…")}</p>}
        {invoices.map((invoice) => {
          const config = STATUS_CONFIG[invoice.status];
          return (
            <div key={invoice.id} className="flex items-center justify-between rounded-lg border border-border p-3 gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{invoice.term}</p>
                <p className="text-xs text-muted-foreground">
                  {formatCurrency(invoice.amount)} {t("·")}{" "}
                  {invoice.status === "paid"
                    ? t("Paid on {{v1}}", { v1: new Date(invoice.paidOn!).toLocaleDateString() })
                    : t("Due {{v1}}", { v1: new Date(invoice.dueDate).toLocaleDateString() })}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant={config.variant}>{t(config.label)}</Badge>
                {invoice.status !== "paid" && (
                  <Button size="sm" onClick={() => setPayTarget(invoice)}>
                    <CreditCard className="w-3.5 h-3.5" />
                    {t("Pay online")}
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
        gateways={config.data?.gateways ?? []}
        prefill={{ name: user?.name, email: user?.email }}
        onPay={async (provider, payer) => {
          if (payTarget) await payMutation.mutateAsync({ provider, payer });
        }}
      />
    </Card>
  );
}
