import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Copy, KeyRound, ShieldAlert } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ErrorState, LoadingState } from "@/components/ui/states";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { formatDateTime } from "@/utils/format";
import { checkPaymentGateway, deletePaymentGateway, listPaymentGateways, savePaymentGateway, type PaymentGatewaySettings } from "../gatewayApi";

/** What each gateway calls its keys, and where the school finds them. */
const GATEWAY_COPY: Record<string, { keyId: string; secret: string; webhookNote: string; keyPlaceholder: string }> = {
  razorpay: {
    keyId: "Key id",
    secret: "Key secret",
    keyPlaceholder: "rzp_test_… or rzp_live_…",
    webhookNote: "In the Razorpay dashboard: Settings → Webhooks → add this URL, tick the payment and refund events, and enter the same secret here.",
  },
  cashfree: {
    keyId: "Client (app) id",
    secret: "Client secret",
    keyPlaceholder: "From Cashfree: Developers → API keys",
    webhookNote: "Cashfree: Developers → Webhooks → add this URL for payment and refund events. Cashfree signs webhooks with the client secret.",
  },
  payu: {
    keyId: "Merchant key",
    secret: "Merchant salt",
    keyPlaceholder: "From PayU: Payment Gateway → Settings",
    webhookNote: "PayU: add this URL as the payment webhook. PayU signs it with the merchant salt.",
  },
  stripe: {
    keyId: "Publishable key",
    secret: "Secret key",
    keyPlaceholder: "pk_test_… or pk_live_…",
    webhookNote: "Stripe: Developers → Webhooks → add this endpoint for the checkout.session and refund events, and enter its signing secret (whsec_…) here.",
  },
};

export default function PaymentGatewaysTab() {
  const { t } = useTranslation("fees");
  const { data: gateways, isLoading, isError, error, refetch } = useQuery({ queryKey: ["fees", "gateways"], queryFn: listPaymentGateways, retry: false });

  if (isLoading) return <LoadingState label={t("Loading payment gateways…")} />;
  if (isError || !gateways) {
    return <ErrorState title={t("We couldn't load the payment gateways")} description={error instanceof Error ? error.message : undefined} onRetry={() => void refetch()} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-secondary-foreground">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning-strong" aria-hidden="true" />
        <p>
          {t("Parents pay the school directly through the gateways switched on here. Keys are stored encrypted and are never shown again, only the last four characters. Use Test mode with the gateway's test keys first; no real money moves.")}
        </p>
      </div>
      {gateways.map((gateway) => (
        <GatewayCard key={gateway.provider} gateway={gateway} />
      ))}
    </div>
  );
}

function GatewayCard({ gateway }: { gateway: PaymentGatewaySettings }) {
  const { t } = useTranslation("fees");
  const queryClient = useQueryClient();
  const copy = GATEWAY_COPY[gateway.provider] ?? GATEWAY_COPY.razorpay;
  const [form, setForm] = useState({ mode: gateway.mode, enabled: gateway.enabled, isDefault: gateway.isDefault, keyId: gateway.keyId ?? "", keySecret: "", webhookSecret: "" });
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    setForm({ mode: gateway.mode, enabled: gateway.enabled, isDefault: gateway.isDefault, keyId: gateway.keyId ?? "", keySecret: "", webhookSecret: "" });
  }, [gateway]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["fees", "gateways"] });
  const fail = (err: unknown) => toast.error(err instanceof Error ? err.message : t("Something went wrong. Please try again."));

  const save = useMutation({
    mutationFn: () => savePaymentGateway(gateway.provider, form),
    onSuccess: () => {
      toast.success(t("{{name}} settings saved", { name: gateway.displayName }));
      void refresh();
    },
    onError: fail,
  });
  const check = useMutation({
    mutationFn: () => checkPaymentGateway(gateway.provider),
    onSuccess: (updated) => {
      if (updated.lastCheckResult === "OK") toast.success(t("{{name}} accepted the keys", { name: gateway.displayName }));
      else toast.error(updated.lastCheckResult ?? t("The keys were not accepted"));
      void refresh();
    },
    onError: fail,
  });
  const remove = useMutation({
    mutationFn: () => deletePaymentGateway(gateway.provider),
    onSuccess: () => {
      toast.success(t("{{name}} keys removed", { name: gateway.displayName }));
      setConfirmRemove(false);
      void refresh();
    },
    onError: (err) => {
      setConfirmRemove(false);
      fail(err);
    },
  });

  const status = gateway.configured
    ? gateway.enabled
      ? { label: gateway.mode === "Live" ? t("Live") : t("Test mode"), variant: gateway.mode === "Live" ? ("success" as const) : ("info" as const) }
      : { label: t("Switched off"), variant: "neutral" as const }
    : gateway.fromPlatform
      ? { label: t("Using the platform account"), variant: "info" as const }
      : { label: t("Not set up"), variant: "neutral" as const };
  const needsSecret = !gateway.configured && !form.keySecret.trim();
  const canSave = form.keyId.trim().length > 0 && !needsSecret;
  const idPrefix = `gw-${gateway.provider}`;

  const copyWebhook = async () => {
    if (!gateway.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(gateway.webhookUrl);
      toast.success(t("Webhook URL copied"));
    } catch {
      toast.error(t("Couldn't copy. Select the address and copy it instead."));
    }
  };

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-primary-text" aria-hidden="true" />
            {gateway.displayName}
            {gateway.isDefault && gateway.enabled && <Badge variant="brand">{t("Default")}</Badge>}
          </CardTitle>
          <CardDescription>
            {gateway.fromPlatform && !gateway.configured
              ? t("The platform's shared account is used until this school saves its own keys.")
              : t("Currencies: {{currencies}}", { currencies: gateway.currencies.join(", ") })}
          </CardDescription>
        </div>
        <Badge variant={status.variant} dot>
          {status.label}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField label={t(copy.keyId)} htmlFor={`${idPrefix}-key`} required>
            <Input id={`${idPrefix}-key`} value={form.keyId} placeholder={copy.keyPlaceholder} autoComplete="off" onChange={(e) => setForm((f) => ({ ...f, keyId: e.target.value }))} />
          </FormField>
          <FormField label={t("Mode")} htmlFor={`${idPrefix}-mode`}>
            <Select value={form.mode} onValueChange={(mode) => setForm((f) => ({ ...f, mode: mode as "Test" | "Live" }))}>
              <SelectTrigger id={`${idPrefix}-mode`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Test">{t("Test (no real money)")}</SelectItem>
                <SelectItem value="Live">{t("Live (real money)")}</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
          <FormField
            label={t(copy.secret)}
            htmlFor={`${idPrefix}-secret`}
            required={!gateway.configured}
            hint={gateway.keySecretHint ? t("Saved {{hint}}. Leave empty to keep it.", { hint: gateway.keySecretHint }) : undefined}
          >
            <Input
              id={`${idPrefix}-secret`}
              type="password"
              value={form.keySecret}
              autoComplete="new-password"
              placeholder={gateway.keySecretHint ?? ""}
              onChange={(e) => setForm((f) => ({ ...f, keySecret: e.target.value }))}
            />
          </FormField>
          {gateway.needsWebhookSecret && (
            <FormField
              label={t("Webhook secret")}
              htmlFor={`${idPrefix}-webhook-secret`}
              hint={gateway.webhookSecretHint ? t("Saved {{hint}}. Leave empty to keep it.", { hint: gateway.webhookSecretHint }) : t("Needed for live payments.")}
            >
              <Input
                id={`${idPrefix}-webhook-secret`}
                type="password"
                value={form.webhookSecret}
                autoComplete="new-password"
                placeholder={gateway.webhookSecretHint ?? ""}
                onChange={(e) => setForm((f) => ({ ...f, webhookSecret: e.target.value }))}
              />
            </FormField>
          )}
        </div>

        {gateway.webhookUrl ? (
          <div className="space-y-1.5">
            <p className="text-sm font-medium text-foreground">{t("Webhook address")}</p>
            <div className="flex items-center gap-2">
              <code className="min-w-0 flex-1 truncate rounded-md border border-border bg-muted px-2.5 py-1.5 text-xs text-secondary-foreground" dir="ltr">
                {gateway.webhookUrl}
              </code>
              <Button type="button" size="sm" variant="outline" onClick={() => void copyWebhook()}>
                <Copy className="h-3.5 w-3.5" /> {t("Copy")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t(copy.webhookNote)}</p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t("The webhook address appears once the server's public address (Payments:ApiBaseUrl) is configured.")}</p>
        )}

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={form.enabled} onCheckedChange={(enabled) => setForm((f) => ({ ...f, enabled, isDefault: enabled && f.isDefault }))} aria-label={t("Accept payments with {{name}}", { name: gateway.displayName })} />
            {t("Accept payments with {{name}}", { name: gateway.displayName })}
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <Switch checked={form.isDefault} disabled={!form.enabled} onCheckedChange={(isDefault) => setForm((f) => ({ ...f, isDefault }))} aria-label={t("Offer first")} />
            {t("Offer first")}
          </label>
        </div>

        {gateway.lastCheckedAt && (
          <p className={gateway.lastCheckResult === "OK" ? "flex items-center gap-1.5 text-xs text-success-strong" : "text-xs text-destructive-strong"}>
            {gateway.lastCheckResult === "OK" && <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />}
            {gateway.lastCheckResult === "OK"
              ? t("Keys checked {{when}}: accepted.", { when: formatDateTime(gateway.lastCheckedAt) })
              : t("Keys checked {{when}}: {{result}}", { when: formatDateTime(gateway.lastCheckedAt), result: gateway.lastCheckResult ?? "" })}
          </p>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          {gateway.configured && (
            <Button type="button" variant="ghost" onClick={() => setConfirmRemove(true)} disabled={remove.isPending}>
              {t("Remove keys")}
            </Button>
          )}
          {gateway.configured && (
            <Button type="button" variant="outline" onClick={() => check.mutate()} loading={check.isPending}>
              {t("Test keys")}
            </Button>
          )}
          <Button type="button" onClick={() => save.mutate()} loading={save.isPending} disabled={!canSave}>
            {t("Save {{name}}", { name: gateway.displayName })}
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={confirmRemove}
        onOpenChange={setConfirmRemove}
        title={t("Remove {{name}} keys?", { name: gateway.displayName })}
        description={t("Parents will no longer be offered {{name}}. Payments already in progress can't be checked without the keys, so this is refused while any are open.", { name: gateway.displayName })}
        confirmLabel={t("Remove keys")}
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => remove.mutate()}
      />
    </Card>
  );
}
