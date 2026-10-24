import { useTranslation } from "react-i18next";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listStaff } from "@/features/staff/api";
import { formatDateTime } from "@/utils/format";
import { CATEGORY_CONFIG, PRIORITY_CONFIG, STATUS_CONFIG } from "../constants";
import { addComment, assignTicket, closeTicket, deleteTicket, getTicket, reopenTicket, resolveTicket } from "../api";
import type { TicketRow } from "../types";

export default function TicketDetailDialog({
  ticketId,
  open,
  onOpenChange,
}: {
  ticketId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useTranslation("helpdesk");
  const queryClient = useQueryClient();
  const { data: ticket } = useQuery({ queryKey: ["helpdesk", "ticket", ticketId], queryFn: () => getTicket(ticketId!), enabled: Boolean(ticketId) && open });
  const { data: staff = [] } = useQuery({ queryKey: ["staff"], queryFn: listStaff });

  const [assigneeId, setAssigneeId] = useState("");
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolveForm, setShowResolveForm] = useState(false);
  const [commentMessage, setCommentMessage] = useState("");
  const [commentAuthorId, setCommentAuthorId] = useState("");
  const [commentVisible, setCommentVisible] = useState(true);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["helpdesk"] });
  };

  const assignMutation = useMutation({
    mutationFn: ({ id, staffId }: { id: string; staffId: string }) => assignTicket(id, staffId),
    onSuccess: () => {
      invalidate();
      toast.success(t("Ticket assigned"));
      setAssigneeId("");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => resolveTicket(id, { resolutionNotes: notes }),
    onSuccess: () => {
      invalidate();
      toast.success(t("Ticket resolved"));
      setShowResolveForm(false);
      setResolutionNotes("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not resolve ticket")),
  });

  const closeMutation = useMutation({
    mutationFn: closeTicket,
    onSuccess: () => {
      invalidate();
      toast.success(t("Ticket closed"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not close ticket")),
  });

  const reopenMutation = useMutation({
    mutationFn: reopenTicket,
    onSuccess: () => {
      invalidate();
      toast.success(t("Ticket reopened"));
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : t("Could not reopen ticket")),
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Parameters<typeof addComment>[1] }) => addComment(id, values),
    onSuccess: () => {
      invalidate();
      toast.success(t("Comment added"));
      setCommentMessage("");
      setCommentAuthorId("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTicket,
    onSuccess: () => {
      invalidate();
      toast.success(t("Ticket deleted"));
      onOpenChange(false);
    },
  });

  if (!ticket) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("Loading…")}</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const tk: TicketRow = ticket;
  const canResolve = tk.status === "open" || tk.status === "in_progress" || tk.status === "reopened";
  const canClose = tk.status === "resolved";
  const canReopen = tk.status === "resolved" || tk.status === "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {tk.ticketNumber}
            <Badge variant={STATUS_CONFIG[tk.status].variant}>{t(STATUS_CONFIG[tk.status].label)}</Badge>
            <Badge variant={PRIORITY_CONFIG[tk.priority].variant}>{t(PRIORITY_CONFIG[tk.priority].label)}</Badge>
            <Badge variant="info">{t(CATEGORY_CONFIG[tk.category].label)}</Badge>
            {tk.isOverdue && (
              <Badge variant="danger">
                <AlertTriangle className="w-3 h-3 me-1 inline" />
                {t("Overdue")}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{tk.subject}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">{t("Raised by")}</p>
              <p className="text-foreground">{tk.raisedByLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("Assigned to")}</p>
              <p className="text-foreground">{tk.assignedTo ? `${tk.assignedTo.firstName} ${tk.assignedTo.lastName} (${tk.assignedTo.designation})` : t("Unassigned")}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("Created")}</p>
              <p className="text-foreground">{formatDateTime(tk.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t("Last updated")}</p>
              <p className="text-foreground">{formatDateTime(tk.updatedAt)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 bg-secondary/30">
            <p className="text-sm text-foreground whitespace-pre-wrap">{tk.description}</p>
          </div>

          {tk.resolutionNotes && (
            <div className="rounded-lg border border-success/30 bg-success-soft p-3">
              <p className="text-xs font-medium text-success-strong mb-1">{t("Resolution notes")}</p>
              <p className="text-sm text-success-strong whitespace-pre-wrap">{tk.resolutionNotes}</p>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder={t("Assign to staff member")} />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} · {s.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              disabled={!assigneeId || assignMutation.isPending}
              onClick={() => assignMutation.mutate({ id: tk.id, staffId: assigneeId })}
            >
              {assignMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {t("Assign")}
            </Button>

            {canResolve && !showResolveForm && (
              <Button variant="outline" size="sm" onClick={() => setShowResolveForm(true)}>
                {t("Resolve")}
              </Button>
            )}
            {canClose && (
              <Button variant="outline" size="sm" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate(tk.id)}>
                {t("Close ticket")}
              </Button>
            )}
            {canReopen && (
              <Button variant="outline" size="sm" disabled={reopenMutation.isPending} onClick={() => reopenMutation.mutate(tk.id)}>
                {t("Reopen")}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-destructive-strong hover:text-destructive-strong" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(tk.id)}>
              {t("Delete")}
            </Button>
          </div>

          {showResolveForm && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label htmlFor="resolve-notes">{t("Resolution notes")}</Label>
              <Textarea id="resolve-notes" rows={2} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder={t("How was this resolved?")} />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={!resolutionNotes.trim() || resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({ id: tk.id, notes: resolutionNotes })}
                >
                  {resolveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  {t("Mark resolved")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowResolveForm(false)}>
                  {t("Cancel")}
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-foreground">{t("Comments & timeline")}</p>
            {tk.comments.length === 0 && <p className="text-sm text-muted-foreground">{t("No comments yet.")}</p>}
            {tk.comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">{c.authorLabel}</p>
                  <div className="flex items-center gap-1.5">
                    {!c.visibleToSubmitter && <Badge variant="neutral">{t("Internal only")}</Badge>}
                    <span className="text-xs text-muted-foreground">{formatDateTime(c.createdAt)}</span>
                  </div>
                </div>
                <p className="text-sm text-foreground mt-1 whitespace-pre-wrap">{c.message}</p>
              </div>
            ))}

            <div className="space-y-2 rounded-lg border border-border p-3">
              <Textarea rows={2} placeholder={t("Add an update…")} value={commentMessage} onChange={(e) => setCommentMessage(e.target.value)} />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Select value={commentAuthorId} onValueChange={setCommentAuthorId}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder={t("Posted by (optional)")} />
                    </SelectTrigger>
                    <SelectContent>
                      {staff.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.firstName} {s.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <Checkbox checked={commentVisible} onCheckedChange={(v) => setCommentVisible(v === true)} />
                    <span className="text-xs text-secondary-foreground">{t("Visible to submitter")}</span>
                  </label>
                </div>
                <Button
                  size="sm"
                  disabled={!commentMessage.trim() || commentMutation.isPending}
                  onClick={() =>
                    commentMutation.mutate({
                      id: tk.id,
                      values: { message: commentMessage, visibleToSubmitter: commentVisible, authorStaffId: commentAuthorId || undefined },
                    })
                  }
                >
                  {commentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  {t("Post")}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
