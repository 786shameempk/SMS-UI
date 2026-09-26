import { Bell, Mail, MessageCircle, MessageSquare, Smartphone } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";
import { CHANNELS } from "../constants";
import type { Channel } from "../types";

const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  email: Mail,
  sms: MessageSquare,
  push: Smartphone,
  whatsapp: MessageCircle,
  "in-app": Bell,
};

export default function ChannelSelector({ value, onChange }: { value: Channel[]; onChange: (channels: Channel[]) => void }) {
  const toggle = (channel: Channel) => {
    onChange(value.includes(channel) ? value.filter((c) => c !== channel) : [...value, channel]);
  };

  const hasSimulated = CHANNELS.some((c) => value.includes(c.value) && c.simulated);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {CHANNELS.map((channel) => {
          const Icon = CHANNEL_ICONS[channel.value];
          const active = value.includes(channel.value);
          return (
            <button
              key={channel.value}
              type="button"
              onClick={() => toggle(channel.value)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors cursor-pointer",
                active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-secondary-foreground hover:bg-secondary",
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              {channel.label}
            </button>
          );
        })}
      </div>
      {hasSimulated && (
        <p className="text-xs text-warning-strong bg-warning-soft border border-warning/30 rounded-md px-2.5 py-2">
          Simulated — email/SMS/push/WhatsApp delivery is not connected to a real provider in this demo. Only in-app delivery is guaranteed instant.
        </p>
      )}
    </div>
  );
}
