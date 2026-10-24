import { useEffect, useState } from "react";
import { CreditCard, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/utils/format";
import type { PayerDetails, PaymentGatewayOption, PayerField } from "@/features/fees/api";
import type { FeeInvoice } from "../types";

import { useTranslation } from "react-i18next";
const FIELD_LABEL: Record<PayerField, string> = { name: "Your name", email: "Email address", phone: "Mobile number" };
const FIELD_INPUT: Record<PayerField, { type: string; autoComplete: string; placeholder: string }> = {
  name: { type: "text", autoComplete: "name", placeholder: "Name of the person paying" },
  email: { type: "email", autoComplete: "email", placeholder: "name@example.com" },
  phone: { type: "tel", autoComplete: "tel-national", placeholder: "10-digit mobile number" },
};

/**
 * Confirm step before a gateway's checkout opens. School Sphere never asks for card, UPI or bank details itself: they are
 * entered on the gateway's own secure page, and the school confirms the payment with the gateway before marking it paid.
 * Gateways that need the payer's phone, email or name ask for it here.
 */
export default function OnlinePaymentDialog({
  open,
  onOpenChange,
  invoice,
  onPay,
  submitting,
  gateways,
  prefill,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoice: FeeInvoice | null;
  onPay: (provider: string, payer: PayerDetails) => Promise<void>;
  submitting: boolean;
  /** The gateways the school has switched on. Empty: online payment isn't set up. */
  gateways: PaymentGatewayOption[];
  prefill: { name?: string; email?: string };
}) {
  const { t } = useTranslation("parent-portal");
  const [provider, setProvider] = useState("");
  const [payer, setPayer] = useState<PayerDetails>({});
  const enabled = gateways.length > 0;
  const selected = gateways.find((g) => g.provider === provider) ?? gateways[0];

  useEffect(() => {
    if (!open) return;
    setProvider((current) => (gateways.some((g) => g.provider === current) ? current : (gateways[0]?.provider ?? "")));
    setPayer((current) => ({ name: current.name ?? prefill.name, email: current.email ?? prefill.email, phone: current.phone }));
  }, [open, gateways, prefill.name, prefill.email]);

  const missing = (selected?.payerFields ?? []).filter((field) => !payer[field]?.trim());
  const phoneInvalid = selected?.payerFields.includes("phone") && payer.phone && !/^\+?[0-9]{10,13}$/.test(payer.phone.replace(/[\s-]/g, ""));
  const canPay = enabled && missing.length === 0 && !phoneInvalid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-primary-text" />
            {t("Pay")} {invoice ? invoice.term : ""} {t("fee")}
          </DialogTitle>
          <DialogDescription>
            {invoice
              ? enabled
                ? t("Amount due: {{v1}}. You'll pay on {{displayName}}'s secure page.", { v1: formatCurrency(invoice.amount), displayName: selected?.displayName })
                : t("Online payment isn't set up for this school yet. Please pay at the school office.")
              : ""}
          </DialogDescription>
        </DialogHeader>

        {gateways.length > 1 && (
          <fieldset className="space-y-1.5">
            <legend className="text-sm font-medium text-foreground">{t("Pay with")}</legend>
            {gateways.map((g) => (
              <label key={g.provider} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent">
                <input
                  type="radio"
                  name="payment-gateway"
                  value={g.provider}
                  checked={selected?.provider === g.provider}
                  onChange={() => setProvider(g.provider)}
                  className="accent-[var(--color-primary)]"
                />
                <span className="font-medium text-foreground">{g.displayName}</span>
                {g.mode === "Test" && <span className="ms-auto text-[11px] text-warning-strong">{t("Test mode")}</span>}
              </label>
            ))}
          </fieldset>
        )}

        {enabled && (selected?.payerFields.length ?? 0) > 0 && (
          <div className="space-y-3">
            {selected.payerFields.map((field) => (
              <div key={field} className="space-y-1.5">
                <Label htmlFor={`payer-${field}`}>{FIELD_LABEL[field]}</Label>
                <Input
                  id={`payer-${field}`}
                  {...FIELD_INPUT[field]}
                  value={payer[field] ?? ""}
                  onChange={(e) => setPayer((p) => ({ ...p, [field]: e.target.value }))}
                  aria-invalid={field === "phone" && phoneInvalid ? true : undefined}
                />
                {field === "phone" && phoneInvalid && <p className="text-xs text-destructive-strong">{t("Enter a 10-digit mobile number.")}</p>}
              </div>
            ))}
            <p className="text-[11px] text-muted-foreground">{t("{{displayName}} asks for these to send you a payment confirmation. They aren't saved by School Sphere.", { displayName: selected.displayName })}</p>
          </div>
        )}

        {enabled && (
          <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3.5 h-3.5" />
            {t("Your card, UPI and bank details go only to")} {selected?.displayName}{t(". The receipt appears here once the payment is confirmed.")}
          </p>
        )}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            {enabled ? t("Cancel") : t("Close")}
          </Button>
          {enabled && (
            <Button type="button" loading={submitting} disabled={!canPay} onClick={() => void onPay(selected.provider, { ...payer, phone: payer.phone?.replace(/[\s-]/g, "") })}>
              {invoice ? t("Continue to pay {{v1}}", { v1: formatCurrency(invoice.amount) }) : t("Continue")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
