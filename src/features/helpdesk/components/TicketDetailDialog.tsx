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
      toast.success("Ticket assigned");
      setAssigneeId("");
    },
  });

  const resolveMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => resolveTicket(id, { resolutionNotes: notes }),
    onSuccess: () => {
      invalidate();
      toast.success("Ticket resolved");
      setShowResolveForm(false);
      setResolutionNotes("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not resolve ticket"),
  });

  const closeMutation = useMutation({
    mutationFn: closeTicket,
    onSuccess: () => {
      invalidate();
      toast.success("Ticket closed");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not close ticket"),
  });

  const reopenMutation = useMutation({
    mutationFn: reopenTicket,
    onSuccess: () => {
      invalidate();
      toast.success("Ticket reopened");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not reopen ticket"),
  });

  const commentMutation = useMutation({
    mutationFn: ({ id, values }: { id: string; values: Parameters<typeof addComment>[1] }) => addComment(id, values),
    onSuccess: () => {
      invalidate();
      toast.success("Comment added");
      setCommentMessage("");
      setCommentAuthorId("");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTicket,
    onSuccess: () => {
      invalidate();
      toast.success("Ticket deleted");
      onOpenChange(false);
    },
  });

  if (!ticket) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Loading…</DialogTitle>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    );
  }

  const t: TicketRow = ticket;
  const canResolve = t.status === "open" || t.status === "in_progress" || t.status === "reopened";
  const canClose = t.status === "resolved";
  const canReopen = t.status === "resolved" || t.status === "closed";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 flex-wrap">
            {t.ticketNumber}
            <Badge variant={STATUS_CONFIG[t.status].variant}>{STATUS_CONFIG[t.status].label}</Badge>
            <Badge variant={PRIORITY_CONFIG[t.priority].variant}>{PRIORITY_CONFIG[t.priority].label}</Badge>
            <Badge variant="info">{CATEGORY_CONFIG[t.category].label}</Badge>
            {t.isOverdue && (
              <Badge variant="danger">
                <AlertTriangle className="w-3 h-3 mr-1 inline" />
                Overdue
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{t.subject}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Raised by</p>
              <p className="text-slate-700">{t.raisedByLabel}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Assigned to</p>
              <p className="text-slate-700">{t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName} (${t.assignedTo.designation})` : "Unassigned"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Created</p>
              <p className="text-slate-700">{formatDateTime(t.createdAt)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last updated</p>
              <p className="text-slate-700">{formatDateTime(t.updatedAt)}</p>
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 bg-secondary/30">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{t.description}</p>
          </div>

          {t.resolutionNotes && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-xs font-medium text-green-700 mb-1">Resolution notes</p>
              <p className="text-sm text-green-800 whitespace-pre-wrap">{t.resolutionNotes}</p>
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            <Select value={assigneeId} onValueChange={setAssigneeId}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Assign to staff member" />
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
              onClick={() => assignMutation.mutate({ id: t.id, staffId: assigneeId })}
            >
              {assignMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Assign
            </Button>

            {canResolve && !showResolveForm && (
              <Button variant="outline" size="sm" onClick={() => setShowResolveForm(true)}>
                Resolve
              </Button>
            )}
            {canClose && (
              <Button variant="outline" size="sm" disabled={closeMutation.isPending} onClick={() => closeMutation.mutate(t.id)}>
                Close ticket
              </Button>
            )}
            {canReopen && (
              <Button variant="outline" size="sm" disabled={reopenMutation.isPending} onClick={() => reopenMutation.mutate(t.id)}>
                Reopen
              </Button>
            )}
            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(t.id)}>
              Delete
            </Button>
          </div>

          {showResolveForm && (
            <div className="space-y-2 rounded-lg border border-border p-3">
              <Label htmlFor="resolve-notes">Resolution notes</Label>
              <Textarea id="resolve-notes" rows={2} value={resolutionNotes} onChange={(e) => setResolutionNotes(e.target.value)} placeholder="How was this resolved?" />
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  disabled={!resolutionNotes.trim() || resolveMutation.isPending}
                  onClick={() => resolveMutation.mutate({ id: t.id, notes: resolutionNotes })}
                >
                  {resolveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Mark resolved
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setShowResolveForm(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <p className="text-sm font-medium text-slate-800">Comments &amp; timeline</p>
            {t.comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet.</p>}
            {t.comments.map((c) => (
              <div key={c.id} className="rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-800">{c.authorLabel}</p>
                  <div className="flex items-center gap-1.5">
                    {!c.visibleToSubmitter && <Badge variant="neutral">Internal only</Badge>}
                    <span className="text-xs text-slate-400">{formatDateTime(c.createdAt)}</span>
                  </div>
                </div>
                <p className="text-sm text-slate-700 mt-1 whitespace-pre-wrap">{c.message}</p>
              </div>
            ))}

            <div className="space-y-2 rounded-lg border border-border p-3">
              <Textarea rows={2} placeholder="Add an update…" value={commentMessage} onChange={(e) => setCommentMessage(e.target.value)} />
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Select value={commentAuthorId} onValueChange={setCommentAuthorId}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="Posted by (optional)" />
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
                    <span className="text-xs text-slate-600">Visible to submitter</span>
                  </label>
                </div>
                <Button
                  size="sm"
                  disabled={!commentMessage.trim() || commentMutation.isPending}
                  onClick={() =>
                    commentMutation.mutate({
                      id: t.id,
                      values: { message: commentMessage, visibleToSubmitter: commentVisible, authorStaffId: commentAuthorId || undefined },
                    })
                  }
                >
                  {commentMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Post
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
