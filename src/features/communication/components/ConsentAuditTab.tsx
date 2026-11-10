import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { ErrorState } from "@/components/ui/states";
import { listAudit, listPreferences, setPreference, type SendableChannel } from "../messaging/platformApi";

/** Communication consent (who opted in or out, where that came from, when) and the audit trail of settings changes. */
export default function ConsentAuditTab() {
  const { t } = useTranslation("communication");
  const queryClient = useQueryClient();
  const prefs = useQuery({ queryKey: ["communication", "preferences"], queryFn: () => listPreferences() });
  const audit = useQuery({ queryKey: ["communication", "audit"], queryFn: () => listAudit() });
  const [channel, setChannel] = useState<SendableChannel>("sms");
  const [address, setAddress] = useState("");
  const [source, setSource] = useState("");
  const record = useMutation({
    mutationFn: (enabled: boolean) => setPreference(channel, address, enabled, source || "admin"),
    onSuccess: (_d, enabled) => {
      toast.success(enabled ? t("Opt-in recorded") : t("Opt-out recorded"));
      setAddress("");
      queryClient.invalidateQueries({ queryKey: ["communication"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (prefs.isError) return <ErrorState onRetry={() => prefs.refetch()} />;
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{t("Consent and preferences")}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t("Record a parent's or staff member's choice with its source. Opt-outs are respected for every ordinary notification; mandatory ones (OTP, emergencies) still go out. Bounced addresses can't be re-enabled here.")}
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <NativeSelect className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={channel} onChange={(e) => setChannel(e.target.value as SendableChannel)} aria-label={t("Channel")}>
              <option value="sms">{t("SMS")}</option>
              <option value="whatsapp">{t("WhatsApp")}</option>
              <option value="email">{t("Email")}</option>
            </NativeSelect>
            <Input className="min-w-40 flex-1" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("Phone or email")} aria-label={t("Address")} />
            <Input className="min-w-40 flex-1" value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("Source, e.g. parent request")} aria-label={t("Source")} />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!address.trim() || record.isPending} onClick={() => record.mutate(true)}>
              {t("Record opt-in")}
            </Button>
            <Button variant="outline" disabled={!address.trim() || record.isPending} onClick={() => record.mutate(false)}>
              {t("Record opt-out")}
            </Button>
          </div>
          <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {(prefs.data ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-2 px-3 py-2 text-sm">
                <span className="flex-1">
                  {p.address}
                  <span className="block text-xs text-muted-foreground">
                    {p.channel} · {p.source ?? "—"} · {new Date(p.updatedAt).toLocaleString()}
                  </span>
                </span>
                <Badge variant={p.optedIn ? "success" : "warning"}>{p.optedIn ? t("Opted in") : t("Opted out")}</Badge>
              </div>
            ))}
            {prefs.data?.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">{t("Nothing recorded yet.")}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("Audit trail")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("Who changed providers, rules, templates and consent, and when. Secrets are never recorded.")}</p>
        </CardHeader>
        <CardContent>
          <div className="max-h-96 divide-y divide-border overflow-y-auto rounded-lg border border-border">
            {(audit.data ?? []).map((a) => (
              <div key={a.id} className="px-3 py-2 text-sm">
                <div className="flex items-center gap-2">
                  <Badge variant="neutral">{a.area}</Badge>
                  <span className="font-medium">{a.action}</span>
                  <span className="truncate">{a.subject}</span>
                </div>
                {a.detail && <p className="mt-0.5 text-xs text-muted-foreground">{a.detail}</p>}
                <p className="text-xs text-muted-foreground">
                  {a.actorEmail ?? "—"} · {new Date(a.at).toLocaleString()}
                </p>
              </div>
            ))}
            {audit.data?.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">{t("No changes yet.")}</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
