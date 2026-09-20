import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRelativeDay } from "@/utils/format";
import { createAnnouncement, deleteAnnouncement, listAnnouncements, toggleAnnouncementActive } from "../api";
import AnnouncementFormDialog from "./AnnouncementFormDialog";

export default function AnnouncementsTab() {
  const queryClient = useQueryClient();
  const { data: announcements = [], isLoading } = useQuery({ queryKey: ["platform", "announcements"], queryFn: listAnnouncements });
  const [formOpen, setFormOpen] = useState(false);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["platform", "announcements"] });

  const createMutation = useMutation({
    mutationFn: createAnnouncement,
    onSuccess: () => {
      invalidate();
      toast.success("Announcement posted");
      setFormOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: toggleAnnouncementActive,
    onSuccess: (a) => {
      invalidate();
      toast.success(a.active ? "Announcement reactivated" : "Announcement deactivated");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAnnouncement,
    onSuccess: () => {
      invalidate();
      toast.success("Announcement deleted");
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground max-w-md">Broadcasts shown to every tenant admin — separate from this school's own Notification Center.</p>
        <Button onClick={() => setFormOpen(true)}>
          <Plus className="w-4 h-4" />
          New announcement
        </Button>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!isLoading && announcements.length === 0 && <p className="text-sm text-muted-foreground">No announcements yet.</p>}

      <div className="space-y-3">
        {announcements.map((a) => (
          <Card key={a.id}>
            <CardContent className="p-4 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center shrink-0">
                  <Megaphone className="w-[18px] h-[18px]" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
                    {a.title}
                    <Badge variant={a.active ? "success" : "neutral"}>{a.active ? "Active" : "Inactive"}</Badge>
                  </p>
                  <p className="text-sm text-slate-600 mt-1">{a.body}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Posted {formatRelativeDay(a.createdAt)}
                    {a.expiresAt && ` · Expires ${formatRelativeDay(a.expiresAt)}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="sm" onClick={() => toggleMutation.mutate(a.id)}>
                  {a.active ? "Deactivate" : "Activate"}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteMutation.mutate(a.id)}>
                  <Trash2 className="w-3.5 h-3.5 text-red-600" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnnouncementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        submitting={createMutation.isPending}
        onSubmit={async (values) => {
          await createMutation.mutateAsync(values);
        }}
      />
    </div>
  );
}
