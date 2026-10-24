import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Mail, MessageCircle, MessageSquare, RotateCw, Smartphone, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { CHANNELS, MESSAGE_STATUS_CONFIG } from "../constants";
import { getDeliverySummary } from "../api";
import { cancelQueued, listDeliveries, retryFailed } from "../messaging/api";
import type { BroadcastMessage, Channel, DeliveryStatus } from "../types";

import { useTranslation } from "react-i18next";
const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  whatsapp: MessageCircle,
  "in-app": Bell,
};

const STATUS_LABEL: Record<DeliveryStatus, string> = {
  queued: "Queued",
  sending: "Sending",
  sent: "Sent",
  delivered: "Delivered",
  read: "Read",
  failed: "Failed",
  bounced: "Bounced",
  skipped: "Skipped",
};

const STATUS_TONE: Record<DeliveryStatus, "neutral" | "info" | "success" | "danger" | "warning"> = {
  queued: "info",
  sending: "info",
  sent: "info",
  delivered: "success",
  read: "success",
  failed: "danger",
  bounced: "danger",
  skipped: "neutral",
};

export default function MessageDetailDialog({
  open,
  onOpenChange,
  message,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: BroadcastMessage | null;
}) {
  const { t } = useTranslation("communication");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<DeliveryStatus | "all">("all");
  const enabled = open && Boolean(message) && message?.status === "sent";
  const { data: summary = [] } = useQuery({
    queryKey: ["communication", "delivery-summary", message?.id],
    queryFn: () => getDeliverySummary(message!.id),
    enabled,
    // Keep polling while the worker still has deliveries waiting.
    refetchInterval: (q) => ((q.state.data ?? []).some((s) => s.queued > 0) ? 5000 : false),
  });
  const deliveries = useQuery({
    queryKey: ["communication", "deliveries", message?.id, filter],
    queryFn: () => listDeliveries(message!.id, filter === "all" ? {} : { status: filter }),
    enabled,
    refetchInterval: summary.some((s) => s.queued > 0) ? 5000 : false,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ["communication"] });
  const retry = useMutation({
    mutationFn: () => retryFailed(message!.id),
    onSuccess: (n) => {
      toast.success(n ? t("{{n}} delivery(ies) queued again", { n }) : t("Nothing to retry"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const cancel = useMutation({
    mutationFn: () => cancelQueued(message!.id),
    onSuccess: (n) => {
      toast.success(n ? t("{{n}} queued delivery(ies) cancelled", { n }) : t("Nothing was waiting"));
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!message) return null;
  const statusConfig = MESSAGE_STATUS_CONFIG[message.status];
  const failed = summary.reduce((n, s) => n + s.failed, 0);
  const queued = summary.reduce((n, s) => n + s.queued, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>{message.subject || t("(no subject)")}</DialogTitle>
          <DialogDescription>
            <Badge variant={statusConfig.variant}>{t(statusConfig.label)}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-foreground whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 px-3 py-2.5">{message.body}</p>

          <div className="flex flex-wrap gap-1.5">
            {message.channels.map((c) => (
              <Badge key={c} variant="neutral">
                {CHANNELS.find((ch) => ch.value === c)?.label ?? c}
              </Badge>
            ))}
          </div>

          <div className="text-sm text-secondary-foreground space-y-1">
            <p>{t("{{recipientCount}} recipients", { recipientCount: message.recipientCount })}</p>
            {message.sentAt && <p>{t("Sent {{v1}}", { v1: new Date(message.sentAt).toLocaleString() })}</p>}
            {message.scheduledAt && !message.sentAt && <p>{t("Scheduled for {{v1}}", { v1: new Date(message.scheduledAt).toLocaleString() })}</p>}
          </div>

          {message.status === "sent" && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="flex-1 text-sm font-medium text-foreground">{t("Delivery by channel")}</p>
                {failed > 0 && (
                  <Button size="sm" variant="outline" onClick={() => retry.mutate()} disabled={retry.isPending}>
                    <RotateCw className="h-4 w-4" /> {t("Retry failed")}
                  </Button>
                )}
                {queued > 0 && (
                  <Button size="sm" variant="outline" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
                    <XCircle className="h-4 w-4" /> {t("Cancel waiting")}
                  </Button>
                )}
              </div>
              {summary.length === 0 && <p className="text-sm text-muted-foreground">{t("No delivery data.")}</p>}
              <div className="space-y-1.5">
                {summary.map((s) => {
                  const Icon = CHANNEL_ICONS[s.channel];
                  return (
                    <div key={s.channel} className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-border px-3 py-2">
                      <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-sm text-foreground flex-1">{CHANNELS.find((ch) => ch.value === s.channel)?.label ?? s.channel}</span>
                      {s.delivered > 0 && <span className="text-xs text-success-strong">{t("{{delivered}} delivered", { delivered: s.delivered })}</span>}
                      {s.sent > 0 && <span className="text-xs text-info-strong">{t("{{sent}} accepted by the provider", { sent: s.sent })}</span>}
                      {s.queued > 0 && <span className="text-xs text-info-strong">{t("{{queued}} queued", { queued: s.queued })}</span>}
                      {s.failed > 0 && <span className="text-xs text-destructive-strong">{t("{{failed}} failed", { failed: s.failed })}</span>}
                      {s.skipped > 0 && <span className="text-xs text-muted-foreground">{t("{{skipped}} skipped", { skipped: s.skipped })}</span>}
                    </div>
                  );
                })}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <p className="flex-1 text-sm font-medium text-foreground">{t("Recipients")}</p>
                <select
                  className="h-8 rounded-md border border-input bg-card px-2 text-xs"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as DeliveryStatus | "all")}
                  aria-label={t("Filter by status")}
                >
                  <option value="all">{t("All statuses")}</option>
                  {(Object.keys(STATUS_LABEL) as DeliveryStatus[]).map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {(deliveries.data ?? []).map((d) => (
                  <div key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate">
                        {d.recipientName ?? t("Unknown")} <span className="text-xs text-muted-foreground">· {d.recipientKind}</span>
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {t(CHANNELS.find((ch) => ch.value === d.channel)?.label ?? "")}
                        {d.address ? ` · ${d.address}` : ""}
                        {d.provider && d.provider !== "InApp" && d.provider !== "Push" ? ` · ${d.provider}` : ""}
                        {d.attemptCount > 1 ? t(" · {{attemptCount}} attempts", { attemptCount: d.attemptCount }) : ""}
                        {d.lastError ? ` · ${d.lastError}` : ""}
                      </p>
                    </div>
                    <StatusBadge status={d.status} label={STATUS_LABEL[d.status]} variant={STATUS_TONE[d.status]} />
                  </div>
                ))}
                {deliveries.data?.length === 0 && <p className="px-3 py-3 text-sm text-muted-foreground">{t("None.")}</p>}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
