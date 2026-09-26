import { Banknote, Bell, CalendarDays, GraduationCap, Settings } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { formatRelativeDay } from "@/utils/format";
import type { NotificationItem } from "../types";

const CATEGORY_ICON = {
  academic: GraduationCap,
  finance: Banknote,
  event: CalendarDays,
  system: Settings,
} as const;

export default function NotificationsCard({ notifications }: { notifications: NotificationItem[] }) {
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-muted-foreground" />
          Notifications
        </CardTitle>
        <CardDescription>{unreadCount} unread</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {notifications.map((n) => {
          const Icon = CATEGORY_ICON[n.category];
          return (
            <div key={n.id} className={cn("flex items-start gap-3 rounded-lg p-2.5", !n.read && "bg-accent/50")}>
              <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                <p className="text-xs text-muted-foreground line-clamp-1">{n.body}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{formatRelativeDay(n.createdAt)}</span>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
