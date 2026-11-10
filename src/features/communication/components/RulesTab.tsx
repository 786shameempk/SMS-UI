import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RotateCcw } from "lucide-react";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Switch } from "@/components/ui/switch";
import { ToggleChip } from "@/components/ui/toggle-chip";
import { ErrorState } from "@/components/ui/states";
import { listRules, resetRule, saveRule, type DeliveryPriority, type NotificationRule } from "../messaging/platformApi";
import type { Channel } from "../types";

const SENDABLE: Array<{ value: Channel; label: string }> = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "sms", label: "SMS" },
  { value: "email", label: "Email" },
];
const PRIORITIES: DeliveryPriority[] = ["low", "normal", "high", "critical"];
const label = (c: Channel) => SENDABLE.find((s) => s.value === c)?.label ?? c;

/**
 * Which channels each kind of event uses. Preferred channels are sent together; fallback channels are held back and tried
 * one at a time, in order, only when everything before them failed for good - so a fallback never doubles a message that
 * is on its way and never costs anything unless it is needed.
 */
export default function RulesTab() {
  const { t } = useTranslation("communication");
  const queryClient = useQueryClient();
  const rules = useQuery({ queryKey: ["communication", "rules"], queryFn: listRules });
  const [editing, setEditing] = useState<NotificationRule | null>(null);
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["communication", "rules"] });
  const reset = useMutation({
    mutationFn: (eventType: string) => resetRule(eventType),
    onSuccess: () => {
      toast.success(t("Back to the platform default"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (rules.isError) return <ErrorState onRetry={() => rules.refetch()} />;
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("Other School Sphere modules ask for an event (a fee reminder, an absence alert) and these rules decide how it is delivered. Fallback channels are only used, and only charged, when the preferred channel fails.")}
      </p>
      <p className="text-sm text-muted-foreground">
        {t("Fee reminders and attendance alerts are sent automatically, so they stay Off until you switch them on here. Set up a provider and an approved template for the event first.")}
      </p>
      <Card>
        <CardHeader>
          <CardTitle>{t("Notification rules")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-start text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pe-3">{t("Event")}</th>
                  <th className="py-2 pe-3">{t("Preferred channels")}</th>
                  <th className="py-2 pe-3">{t("Fallback, in order")}</th>
                  <th className="py-2 pe-3">{t("Priority")}</th>
                  <th className="py-2 pe-3">{t("Status")}</th>
                  <th className="py-2 text-end">{t("Actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(rules.data ?? []).map((r) => (
                  <tr key={r.eventType}>
                    <td className="py-2 pe-3">
                      <div className="font-medium">{r.name}</div>
                      <div className="font-mono text-xs text-muted-foreground">{r.eventType}</div>
                    </td>
                    <td className="py-2 pe-3">{r.primaryChannels.map(label).join(" + ") || "—"}</td>
                    <td className="py-2 pe-3">{r.fallbackChannels.map(label).join(" → ") || "—"}</td>
                    <td className="py-2 pe-3 capitalize">{t(r.priority)}</td>
                    <td className="py-2 pe-3">
                      <div className="flex flex-wrap gap-1">
                        {!r.active && <Badge variant="neutral">{t("Off")}</Badge>}
                        {r.mandatory && <Badge variant="warning">{t("Mandatory")}</Badge>}
                        {r.customized ? <Badge variant="info">{t("Customised")}</Badge> : <Badge variant="neutral">{t("Default")}</Badge>}
                      </div>
                    </td>
                    <td className="py-2 text-end">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="outline" onClick={() => setEditing(r)}>
                          {t("Edit")}
                        </Button>
                        {r.customized && (
                          <Button size="sm" variant="ghost" aria-label={t("Reset {{name}} to default", { name: r.name })} onClick={() => reset.mutate(r.eventType)}>
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      {editing && <RuleDialog key={editing.eventType} rule={editing} onClose={() => setEditing(null)} onSaved={refresh} />}
    </div>
  );
}

function RuleDialog({ rule, onClose, onSaved }: { rule: NotificationRule; onClose: () => void; onSaved: () => void }) {
  const { t } = useTranslation("communication");
  const [primary, setPrimary] = useState<Channel[]>(rule.primaryChannels);
  const [fallback, setFallback] = useState<Channel[]>(rule.fallbackChannels);
  const [mandatory, setMandatory] = useState(rule.mandatory);
  const [active, setActive] = useState(rule.active);
  const [priority, setPriority] = useState<DeliveryPriority>(rule.priority);

  // A channel is either preferred or a fallback, never both.
  const togglePrimary = (c: Channel) => {
    setPrimary((p) => (p.includes(c) ? p.filter((x) => x !== c) : [...p, c]));
    setFallback((f) => f.filter((x) => x !== c));
  };
  const toggleFallback = (c: Channel) => setFallback((f) => (f.includes(c) ? f.filter((x) => x !== c) : [...f, c]));

  const save = useMutation({
    mutationFn: () => saveRule(rule.eventType, { name: rule.name, primaryChannels: primary, fallbackChannels: fallback, mandatory, active, priority }),
    onSuccess: () => {
      toast.success(t("Rule saved"));
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const invalid = active && primary.length === 0;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{rule.name}</DialogTitle>
          <DialogDescription className="font-mono text-xs">{rule.eventType}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{t("Send on (all at once)")}</Label>
            <div role="group" aria-label={t("Preferred channels")} className="flex flex-wrap gap-1.5">
              {SENDABLE.map((c) => (
                <ToggleChip key={c.value} size="lg" pressed={primary.includes(c.value)} onClick={() => togglePrimary(c.value)}>
                  {t(c.label)}
                </ToggleChip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>{t("If those fail for good, try (in the order picked)")}</Label>
            <div role="group" aria-label={t("Fallback channels")} className="flex flex-wrap gap-1.5">
              {SENDABLE.filter((c) => !primary.includes(c.value)).map((c) => (
                <ToggleChip key={c.value} size="lg" pressed={fallback.includes(c.value)} onClick={() => toggleFallback(c.value)}>
                  {fallback.includes(c.value) ? `${fallback.indexOf(c.value) + 1}. ` : ""}
                  {t(c.label)}
                </ToggleChip>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rule-priority">{t("Priority")}</Label>
            <NativeSelect id="rule-priority" className="h-9 w-full rounded-md border border-input bg-card px-2 text-sm" value={priority} onChange={(e) => setPriority(e.target.value as DeliveryPriority)}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {t(p.charAt(0).toUpperCase() + p.slice(1))}
                </option>
              ))}
            </NativeSelect>
          </div>
          <label className="flex items-start justify-between gap-3 rounded-lg border border-border p-3 text-sm">
            <span>
              <span className="block font-medium">{t("Mandatory")}</span>
              <span className="block text-xs text-muted-foreground">{t("Sent even if the person opted out (OTP, emergencies). Bounced or invalid addresses are still skipped.")}</span>
            </span>
            <Switch checked={mandatory} onCheckedChange={setMandatory} aria-label={t("Mandatory")} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
            <span className="font-medium">{t("Rule switched on")}</span>
            <Switch checked={active} onCheckedChange={setActive} aria-label={t("Rule switched on")} />
          </label>
          {invalid && <p className="text-sm text-destructive-strong">{t("Pick at least one channel, or switch the rule off.")}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t("Cancel")}
          </Button>
          <Button onClick={() => save.mutate()} loading={save.isPending} disabled={invalid}>
            {t("Save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
