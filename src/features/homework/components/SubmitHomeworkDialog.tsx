import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTime } from "@/utils/format";
import { submitHomework } from "../api";
import { SUBMISSION_STATUS_CONFIG } from "../constants";
import type { AssignedHomeworkRow } from "../types";

export default function SubmitHomeworkDialog({
  open,
  onOpenChange,
  row,
  studentId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  row: AssignedHomeworkRow | null;
  studentId: string;
}) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");

  useEffect(() => {
    if (open && row) setContent(row.submission.status === "graded" ? row.submission.content : row.submission.content || "");
  }, [open, row]);

  const submitMutation = useMutation({
    mutationFn: () => submitHomework(row!.homework.id, studentId, content.trim()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework", "assigned", studentId] });
      queryClient.invalidateQueries({ queryKey: ["homework", "progress"] });
      toast.success("Homework submitted");
      onOpenChange(false);
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not submit homework"),
  });

  if (!row) return null;
  const { homework, submission } = row;
  const config = SUBMISSION_STATUS_CONFIG[submission.status];
  const canEdit = submission.status !== "graded";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{homework.title}</DialogTitle>
          <DialogDescription>{homework.description}</DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
          <Badge variant={config.variant}>{config.label}</Badge>
          <span>Due {new Date(homework.dueDate).toLocaleDateString()}</span>
          {homework.attachmentNote && <span>· Attachment: {homework.attachmentNote}</span>}
        </div>

        {submission.status === "resubmit_requested" && submission.feedback && (
          <div className="rounded-lg border border-warning/30 bg-warning-soft p-3 text-sm text-warning-strong">
            <p className="font-medium">Your teacher asked you to resubmit:</p>
            <p className="mt-1">{submission.feedback}</p>
          </div>
        )}

        {submission.status === "graded" && (
          <div className="rounded-lg border border-border bg-secondary/40 p-3 text-sm space-y-1">
            <p className="font-medium text-foreground">Grade: {submission.grade}</p>
            {submission.feedback && <p className="text-secondary-foreground">{submission.feedback}</p>}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="submission-content">Your answer</Label>
          <Textarea
            id="submission-content"
            rows={6}
            placeholder="Type your submission here…"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            disabled={!canEdit}
          />
          {submission.submittedAt && (
            <p className="text-xs text-muted-foreground">Last submitted {formatDateTime(submission.submittedAt)}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {canEdit && (
            <Button type="button" disabled={!content.trim() || submitMutation.isPending} onClick={() => submitMutation.mutate()}>
              {submitMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {submission.status === "not_submitted" ? "Submit" : "Resubmit"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
