import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Copy, Loader2, Save, Send, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ErrorState } from "@/components/ui/states";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  addSuppression,
  listOptIns,
  listProviders,
  listSuppressions,
  recordOptIns,
  removeSuppression,
  saveProvider,
  sendTest,
  type ProviderConfig,
  type ProviderName,
} from "../messaging/api";
import { CHANNEL_TITLES, PROVIDERS, providersFor } from "../messaging/providers";
import type { Channel } from "../types";

import { useTranslation } from "react-i18next";
/** Administrators: connect a provider per channel, prove it with a real test message, and manage opt-outs and opt-ins. */
export default function MessagingSettingsTab() {
  const { t } = useTranslation("communication");
  const providers = useQuery({ queryKey: ["communication", "providers"], queryFn: listProviders });
  if (providers.isError) return <ErrorState onRetry={() => providers.refetch()} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("Messages only leave School Sphere through the providers connected here. Secrets are stored encrypted and are never shown again; leave a secret field empty to keep the stored value.")}
      </p>
      {(providers.data ?? []).map((config) => (
        <ProviderCard key={config.channel} config={config} />
      ))}
      <div className="grid gap-4 lg:grid-cols-2">
        <SuppressionsCard />
        <OptInsCard />
      </div>
    </div>
  );
}

function ProviderCard({ config }: { config: ProviderConfig }) {
  const { t } = useTranslation("communication");
  const queryClient = useQueryClient();
  const options = providersFor(config.channel);
  const [provider, setProvider] = useState<ProviderName>(config.provider ?? options[0].name);
  const definition = PROVIDERS.find((p) => p.name === provider)!;
  const [settings, setSettings] = useState<Record<string, string>>(config.provider === provider ? config.settings : {});
  const [secrets, setSecrets] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(config.enabled);
  const [perMinute, setPerMinute] = useState(config.perMinuteLimit);
  const [daily, setDaily] = useState(config.dailyLimit);
  const [cost, setCost] = useState(config.costPerMessage?.toString() ?? "");
  const [optInAtAdmission, setOptInAtAdmission] = useState(config.optInCollectedAtAdmission);
  const [testTo, setTestTo] = useState("");

  const save = useMutation({
    mutationFn: () =>
      saveProvider(config.channel, {
        provider,
        enabled,
        settings,
        secrets,
        perMinuteLimit: perMinute,
        dailyLimit: daily,
        costPerMessage: cost === "" ? null : Number(cost),
        optInCollectedAtAdmission: optInAtAdmission,
      }),
    onSuccess: () => {
      toast.success(t("{{v1}} settings saved", { v1: CHANNEL_TITLES[config.channel] }));
      setSecrets({});
      queryClient.invalidateQueries({ queryKey: ["communication"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const test = useMutation({
    mutationFn: () => sendTest(config.channel, testTo),
    onSuccess: (r) => {
      (r.accepted ? toast.success : toast.error)(r.message);
      queryClient.invalidateQueries({ queryKey: ["communication", "providers"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const sameProvider = config.provider === provider;
  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2">
            {CHANNEL_TITLES[config.channel]}
            {config.enabled && config.configured ? <Badge variant="success">{t("On")}</Badge> : <Badge variant="neutral">{t("Off")}</Badge>}
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {config.platformDefaultAvailable && !config.provider
              ? t("Using the platform's {{platformDefaultProvider}} until you connect your own.", { platformDefaultProvider: config.platformDefaultProvider })
              : definition.help}
          </p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          {t("Switched on")}
          <Switch checked={enabled} onCheckedChange={setEnabled} aria-label={t("{{v1}} on", { v1: CHANNEL_TITLES[config.channel] })} />
        </label>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label>{t("Provider")}</Label>
            <Select
              value={provider}
              onValueChange={(v) => {
                setProvider(v as ProviderName);
                setSettings(config.provider === v ? config.settings : {});
                setSecrets({});
              }}
            >
              <SelectTrigger aria-label={t("{{v1}} provider", { v1: CHANNEL_TITLES[config.channel] })}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {options.map((p) => (
                  <SelectItem key={p.name} value={p.name}>
                    {t(p.label)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {definition.fields.map((f) => {
            const id = `${config.channel}-${f.key}`;
            const stored = f.secret && sameProvider && config.secretsSet.includes(f.key);
            return (
              <div key={f.key} className="space-y-1.5">
                <Label htmlFor={id}>
                  {t(f.label)}
                  {f.required && <span className="text-destructive"> *</span>}
                </Label>
                <Input
                  id={id}
                  type={f.secret ? "password" : "text"}
                  autoComplete={f.secret ? "new-password" : "off"}
                  placeholder={stored ? t("•••••••• stored") : f.placeholder}
                  value={f.secret ? secrets[f.key] ?? "" : settings[f.key] ?? ""}
                  onChange={(e) =>
                    f.secret ? setSecrets({ ...secrets, [f.key]: e.target.value }) : setSettings({ ...settings, [f.key]: e.target.value })
                  }
                />
              </div>
            );
          })}
          <div className="space-y-1.5">
            <Label htmlFor={`${config.channel}-pm`}>{t("Max per minute")}</Label>
            <Input id={`${config.channel}-pm`} type="number" min={1} max={1000} value={perMinute} onChange={(e) => setPerMinute(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${config.channel}-day`}>{t("Max per day")}</Label>
            <Input id={`${config.channel}-day`} type="number" min={1} value={daily} onChange={(e) => setDaily(Number(e.target.value))} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${config.channel}-cost`}>{t("Your price per message (for usage reports)")}</Label>
            <Input id={`${config.channel}-cost`} type="number" min={0} step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} />
          </div>
        </div>

        {config.channel === "whatsapp" && (
          <label className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
            <Switch checked={optInAtAdmission} onCheckedChange={setOptInAtAdmission} aria-label={t("Opt-in collected at admission")} />
            <span>
              {t("We collected WhatsApp opt-in from every parent and staff member (for example on the admission form). Without this, WhatsApp only goes to numbers recorded under Opt-ins below. Anyone who replies STOP is never messaged again.")}
            </span>
          </label>
        )}

        {config.missingFields.length > 0 && sameProvider && (
          <p className="flex items-start gap-2 text-sm text-warning-strong">
            <CircleAlert className="mt-0.5 h-4 w-4 shrink-0" /> {t("Still needed:")} {config.missingFields.join(", ")}.
          </p>
        )}

        {config.webhookUrl && sameProvider && (
          <div className="space-y-1">
            <Label>{t("Webhook / callback URL")}</Label>
            <div className="flex gap-2">
              <Input readOnly value={config.webhookUrl} className="font-mono text-xs" aria-label={t("Webhook URL")} />
              <Button
                variant="outline"
                onClick={() => {
                  navigator.clipboard?.writeText(config.webhookUrl!);
                  toast.success(t("Copied"));
                }}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            {definition.webhookHelp && <p className="text-xs text-muted-foreground">{definition.webhookHelp}</p>}
          </div>
        )}

        <div className="flex flex-wrap items-end gap-3">
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t("Save")}
          </Button>
          <div className="flex min-w-[260px] flex-1 gap-2">
            <Input
              value={testTo}
              onChange={(e) => setTestTo(e.target.value)}
              placeholder={config.channel === "email" ? t("Send a test to: you@school.in") : t("Send a test to: +91 98765 43210")}
              aria-label={t("Test {{v1}} recipient", { v1: CHANNEL_TITLES[config.channel] })}
            />
            <Button variant="outline" onClick={() => test.mutate()} disabled={!testTo.trim() || test.isPending || !config.enabled}>
              {test.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {t("Send test")}
            </Button>
          </div>
        </div>
        {config.lastTestAt && (
          <p className="flex items-start gap-2 text-xs text-muted-foreground">
            {config.lastTestSucceeded ? <CheckCircle2 className="h-4 w-4 text-success" /> : <CircleAlert className="h-4 w-4 text-destructive" />}
            {t("Last test")} {new Date(config.lastTestAt).toLocaleString()}: {config.lastTestMessage}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SuppressionsCard() {
  const { t } = useTranslation("communication");
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: ["communication", "suppressions"], queryFn: listSuppressions });
  const [channel, setChannel] = useState<Channel>("email");
  const [address, setAddress] = useState("");
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["communication", "suppressions"] });
  const add = useMutation({
    mutationFn: () => addSuppression(channel, address),
    onSuccess: () => {
      setAddress("");
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const remove = useMutation({ mutationFn: removeSuppression, onSuccess: refresh, onError: (e: Error) => toast.error(e.message) });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Do not contact")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("Opt-outs, bounced addresses and spam complaints. These are skipped automatically.")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <select className="h-9 rounded-md border border-input bg-card px-2 text-sm" value={channel} onChange={(e) => setChannel(e.target.value as Channel)} aria-label={t("Channel")}>
            <option value="email">{t("Email")}</option>
            <option value="sms">{t("SMS")}</option>
            <option value="whatsapp">{t("WhatsApp")}</option>
          </select>
          <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t("Address or number")} aria-label={t("Address to suppress")} />
          <Button variant="outline" onClick={() => add.mutate()} disabled={!address.trim() || add.isPending}>
            {t("Add")}
          </Button>
        </div>
        <div className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border">
          {(rows.data ?? []).map((s) => (
            <div key={s.id} className="flex items-center gap-2 px-3 py-2 text-sm">
              <span className="flex-1">
                {s.address} <span className="text-xs text-muted-foreground">· {s.channel} · {s.reason}{s.source ? ` (${s.source})` : ""}</span>
              </span>
              <Button size="sm" variant="ghost" aria-label={t("Remove {{address}}", { address: s.address })} onClick={() => remove.mutate(s.id)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {rows.data?.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">{t("Nobody has opted out.")}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

function OptInsCard() {
  const { t } = useTranslation("communication");
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: ["communication", "optins"], queryFn: listOptIns });
  const [numbers, setNumbers] = useState("");
  const [source, setSource] = useState("");
  const record = useMutation({
    mutationFn: () => recordOptIns(numbers.split(/[\s,;]+/).filter(Boolean), source),
    onSuccess: (n) => {
      toast.success(t("{{n}} number(s) recorded", { n }));
      setNumbers("");
      queryClient.invalidateQueries({ queryKey: ["communication", "optins"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("WhatsApp opt-ins")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("Record numbers that agreed to receive WhatsApp messages, and where that agreement came from.")}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Textarea value={numbers} onChange={(e) => setNumbers(e.target.value)} placeholder={t("One number per line")} rows={3} aria-label={t("Opted-in numbers")} />
        <div className="flex gap-2">
          <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("Source, e.g. Admission form 2026")} aria-label={t("Opt-in source")} />
          <Button variant="outline" onClick={() => record.mutate()} disabled={!numbers.trim() || !source.trim() || record.isPending}>
            {t("Record")}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {rows.data ? t("{{length}} opted in, {{length1}} opted out.", { length: rows.data.filter((o) => o.optedIn).length, length1: rows.data.filter((o) => !o.optedIn).length }) : t("Loading…")}
        </p>
      </CardContent>
    </Card>
  );
}
