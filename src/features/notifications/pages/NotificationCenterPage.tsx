import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Banknote, CalendarDays, Check, GraduationCap, Megaphone, Plus, Settings, Sparkles, Trash2, Video } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { formatRelativeDay } from "@/utils/format";
import { CATEGORY_CONFIG } from "../constants";
import { deleteNotification, listMyNotifications, markAllReadForCurrentUser, markRead, postAnnouncement } from "../api";
import type { Notification, NotificationCategory } from "../types";
import AnnouncementFormDialog from "../components/AnnouncementFormDialog";
import { PageContainer, PageHeader } from "@/components/ui/page";

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

const ANNOUNCER_ROLES = new Set(["superAdmin", "admin", "principal"]);

export default function NotificationCenterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [formOpen, setFormOpen] = useState(false);

  const { data: notifications = [], isLoading } = useQuery({ queryKey: ["notifications", "mine"], queryFn: listMyNotifications });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const markReadMutation = useMutation({ mutationFn: markRead, onSuccess: invalidate });
  const markAllReadMutation = useMutation({
    mutationFn: markAllReadForCurrentUser,
    onSuccess: () => {
      invalidate();
      toast.success("All notifications marked read");
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => {
      invalidate();
      toast.success("Notification deleted");
    },
  });
  const postMutation = useMutation({
    mutationFn: postAnnouncement,
    onSuccess: () => {
      invalidate();
      toast.success("Announcement posted");
      setFormOpen(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not post announcement"),
  });

  const unreadCount = notifications.filter((n) => !n.read).length;
  const canAnnounce = Boolean(user && ANNOUNCER_ROLES.has(user.role));

  const handleView = (n: Notification) => {
    if (!n.read) markReadMutation.mutate(n.id);
    if (n.actionUrl) navigate(n.actionUrl);
  };

  return (
    <PageContainer width="narrow">
      <PageHeader
        title="Notification center"
        description={unreadCount > 0 ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}` : "You're all caught up."}
        actions={
          <>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <Button variant="outline" onClick={() => markAllReadMutation.mutate()} disabled={markAllReadMutation.isPending}>
                  <Check className="w-4 h-4" />
                  Mark all read
                </Button>
              )}
              {canAnnounce && (
                <Button onClick={() => setFormOpen(true)}>
                  <Plus className="w-4 h-4" />
                  Post announcement
                </Button>
              )}
            </div>
          </>
        }
      />

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading && <p className="px-4 py-8 text-sm text-muted-foreground text-center">Loading…</p>}
        {!isLoading && notifications.length === 0 && <p className="px-4 py-8 text-sm text-muted-foreground text-center">No notifications yet.</p>}
        <div className="divide-y divide-border">
          {notifications.map((n) => {
            const Icon = CATEGORY_ICON[n.category];
            const categoryConfig = CATEGORY_CONFIG[n.category];
            return (
              <div key={n.id} className={cn("flex items-start gap-3 px-4 py-3.5", !n.read && "bg-brand-50/40")}>
                <div className="w-9 h-9 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <Badge variant={categoryConfig.variant}>{categoryConfig.label}</Badge>
                    {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.body}</p>
                  <p className="text-xs text-muted-foreground mt-1">{formatRelativeDay(n.createdAt)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {n.actionUrl && (
                    <Button variant="outline" size="sm" onClick={() => handleView(n)}>
                      {n.actionLabel ?? "View"}
                    </Button>
                  )}
                  {!n.read && !n.actionUrl && (
                    <Button variant="ghost" size="sm" onClick={() => markReadMutation.mutate(n.id)}>
                      Mark read
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(n.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={postMutation.isPending}
        onSubmit={async (values) => {
          await postMutation.mutateAsync(values);
        }}
      />
    </PageContainer>
  );
}
