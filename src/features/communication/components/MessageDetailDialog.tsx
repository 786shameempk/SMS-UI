import { useQuery } from "@tanstack/react-query";
import { Bell, Mail, MessageCircle, MessageSquare, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CHANNELS, MESSAGE_STATUS_CONFIG } from "../constants";
import { getDeliverySummary } from "../api";
import type { BroadcastMessage, Channel } from "../types";

const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  whatsapp: MessageCircle,
  "in-app": Bell,
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
  const { data: summary = [] } = useQuery({
    queryKey: ["communication", "delivery-summary", message?.id],
    queryFn: () => getDeliverySummary(message!.id),
    enabled: open && Boolean(message) && message?.status === "sent",
  });

  if (!message) return null;
  const statusConfig = MESSAGE_STATUS_CONFIG[message.status];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-lg">
        <DialogHeader>
          <DialogTitle>{message.subject || "(no subject)"}</DialogTitle>
          <DialogDescription>
            <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <p className="text-sm text-slate-700 whitespace-pre-wrap rounded-lg border border-border bg-secondary/30 px-3 py-2.5">{message.body}</p>

          <div className="flex flex-wrap gap-1.5">
            {message.channels.map((c) => (
              <Badge key={c} variant="neutral">
                {CHANNELS.find((ch) => ch.value === c)?.label ?? c}
              </Badge>
            ))}
          </div>

          <div className="text-sm text-slate-600 space-y-1">
            <p>{message.recipientCount} recipients</p>
            {message.sentAt && <p>Sent {new Date(message.sentAt).toLocaleString()}</p>}
            {message.scheduledAt && !message.sentAt && <p>Scheduled for {new Date(message.scheduledAt).toLocaleString()}</p>}
          </div>

          {message.status === "sent" && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-800">Delivery by channel</p>
              {summary.length === 0 && <p className="text-sm text-muted-foreground">No delivery data.</p>}
              <div className="space-y-1.5">
                {summary.map((s) => {
                  const Icon = CHANNEL_ICONS[s.channel];
                  const total = s.delivered + s.failed;
                  return (
                    <div key={s.channel} className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
                      <Icon className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="text-sm text-slate-700 flex-1">{CHANNELS.find((ch) => ch.value === s.channel)?.label ?? s.channel}</span>
                      <span className="text-xs text-emerald-700">{s.delivered} delivered</span>
                      {s.failed > 0 && <span className="text-xs text-red-600">{s.failed} failed</span>}
                      <span className="text-xs text-muted-foreground">/ {total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
