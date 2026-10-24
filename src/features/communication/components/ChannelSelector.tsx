import { useQuery } from "@tanstack/react-query";
import { Bell, Mail, MessageCircle, MessageSquare, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { CHANNELS } from "../constants";
import { getChannelStatus } from "../messaging/api";
import type { Channel } from "../types";

import { useTranslation } from "react-i18next";
const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  whatsapp: MessageCircle,
  "in-app": Bell,
};

/** Channel picker that says, from the server, whether each chosen channel can actually send. */
export default function ChannelSelector({ value, onChange }: { value: Channel[]; onChange: (channels: Channel[]) => void }) {
  const { t } = useTranslation("communication");
  const status = useQuery({ queryKey: ["communication", "channel-status"], queryFn: getChannelStatus, staleTime: 60_000 });
  const toggle = (channel: Channel) => {
    onChange(value.includes(channel) ? value.filter((c) => c !== channel) : [...value, channel]);
  };
  const notReady = (status.data ?? []).filter((s) => value.includes(s.channel) && !s.ready);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {CHANNELS.map((channel) => {
          const Icon = CHANNEL_ICONS[channel.value];
          const active = value.includes(channel.value);
          const ready = status.data?.find((s) => s.channel === channel.value)?.ready;
          return (
            <button
              key={channel.value}
              type="button"
              onClick={() => toggle(channel.value)}
              title={status.data?.find((s) => s.channel === channel.value)?.message}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-secondary-foreground hover:bg-secondary",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {t(channel.label)}
              {ready === false && <span className="ms-0.5 rounded bg-warning-soft px-1 text-[10px] font-semibold text-warning-strong">{t("not set up")}</span>}
            </button>
          );
        })}
      </div>
      {notReady.length > 0 && (
        <p className="text-xs text-warning-strong bg-warning-soft border border-warning/30 rounded-md px-2.5 py-2">
          {notReady.map((s) => s.message).join(" ")} {t("These recipients will be listed as skipped.")}
        </p>
      )}
    </div>
  );
}
