import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { formatRelativeDay } from "@/utils/format";
import { listNotifications, markNotificationRead } from "../api";

export default function NotificationsTab() {
  const queryClient = useQueryClient();
  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ["parent-portal", "notifications"],
    queryFn: listNotifications,
  });

  const readMutation = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: (updated) => queryClient.setQueryData(["parent-portal", "notifications"], updated),
  });

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
        {isLoading && <p className="text-sm text-muted-foreground">Loading notifications…</p>}
        {notifications.map((n) => (
          <div key={n.id} className={cn("flex items-start justify-between gap-3 rounded-lg p-3", !n.read && "bg-accent/50")}>
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{n.title}</p>
              <p className="text-xs text-muted-foreground">{n.body}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{formatRelativeDay(n.createdAt)}</p>
            </div>
            {!n.read && (
              <Button variant="ghost" size="sm" onClick={() => readMutation.mutate(n.id)} className="shrink-0">
                Mark read
              </Button>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
