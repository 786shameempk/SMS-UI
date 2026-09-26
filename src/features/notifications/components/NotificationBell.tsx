import { Bell, Check, Megaphone, Banknote, CalendarDays, GraduationCap, Settings, AlertTriangle, Sparkles, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { formatRelativeDay } from "@/utils/format";
import { getUnreadCountForCurrentUser, listMyNotifications, markAllReadForCurrentUser, markRead } from "../api";
import type { Notification, NotificationCategory } from "../types";

const CATEGORY_ICON: Record<NotificationCategory, LucideIcon> = {
  announcement: Megaphone,
  academic: GraduationCap,
  finance: Banknote,
  event: CalendarDays,
  system: Settings,
  alert: AlertTriangle,
  talent: Sparkles,
  meeting: Video,
};

export default function NotificationBell() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: notifications = [] } = useQuery({ queryKey: ["notifications", "mine"], queryFn: listMyNotifications });
  const { data: unreadCount = 0 } = useQuery({ queryKey: ["notifications", "unread-count"], queryFn: getUnreadCountForCurrentUser });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markReadMutation = useMutation({ mutationFn: markRead, onSuccess: invalidate });
  const markAllReadMutation = useMutation({ mutationFn: markAllReadForCurrentUser, onSuccess: invalidate });

  const handleOpen = (notification: Notification) => {
    if (!notification.read) markReadMutation.mutate(notification.id);
    if (notification.actionUrl) navigate(notification.actionUrl);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative w-9 h-9 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors cursor-pointer"
          aria-label="Notifications"
        >
          <Bell className="w-4.5 h-4.5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between px-3.5 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllReadMutation.mutate()}
              disabled={markAllReadMutation.isPending}
            >
              <Check className="w-3 h-3" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-80 overflow-y-auto divide-y divide-border">
          {notifications.length === 0 && <p className="px-3.5 py-6 text-sm text-muted-foreground text-center">You're all caught up.</p>}
          {notifications.slice(0, 8).map((n) => {
            const Icon = CATEGORY_ICON[n.category];
            return (
              <button
                key={n.id}
                type="button"
                onClick={() => handleOpen(n)}
                className={cn("flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left hover:bg-secondary/50 cursor-pointer", !n.read && "bg-accent/50")}
              >
                <div className="w-7 h-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-3.5 h-3.5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{n.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{n.body}</p>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <span className="text-[11px] text-muted-foreground">{formatRelativeDay(n.createdAt)}</span>
                  {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="px-3.5 py-2.5 border-t border-border">
          <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate("/notifications")}>
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
