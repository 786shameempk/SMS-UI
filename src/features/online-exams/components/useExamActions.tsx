import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Award, CalendarCheck2, Copy, Eye, Pencil, Rocket, Send, Trash2, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { FormField } from "@/components/ui/form-field";
import { Textarea } from "@/components/ui/textarea";
import { cancelOnlineExam, deleteOnlineExam, duplicateOnlineExam, publishExamResults, scheduleOnlineExam } from "../api";
import { EXAM_STATUS_LABEL, EXAM_STATUS_TONE } from "../constants";
import type { OnlineExamListItem, OnlineExamStatus } from "../types";

export function ExamStatusBadge({ status }: { status: OnlineExamStatus }) {
  return (
    <Badge variant={EXAM_STATUS_TONE[status]} dot>
      {EXAM_STATUS_LABEL[status]}
    </Badge>
  );
}

type Pending = { kind: "delete" | "publish" | "schedule" | "startNow"; exam: OnlineExamListItem } | null;

/** What each status allows - the server enforces the same rules. */
export function allowedActions(exam: OnlineExamListItem) {
  const s = exam.status;
  return {
    edit: exam.canManage && (s === "Draft" || s === "Scheduled"),
    schedule: exam.canManage && s === "Draft",
    publish: exam.canManage && s === "Completed",
    results: s === "Active" || s === "Completed" || s === "Published" || (s === "Cancelled" && exam.submittedCount > 0),
    cancel: exam.canManage && (s === "Draft" || s === "Scheduled" || s === "Active" || s === "Completed"),
    delete: exam.canManage && (s === "Draft" || s === "Cancelled" || s === "Scheduled") && exam.submittedCount === 0,
    duplicate: exam.canManage,
  };
}

/**
 * The exam actions menu plus the dialogs it opens, shared by the exam list and the exam page.
 * Returns menu items for a row and one element holding every dialog.
 */
export function useExamActions({ onDeleted }: { onDeleted?: () => void } = {}) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [pending, setPending] = useState<Pending>(null);
  const [cancelTarget, setCancelTarget] = useState<OnlineExamListItem | null>(null);
  const [reason, setReason] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["online-exams"] });
  const onError = (err: unknown) => toast.error(err instanceof Error ? err.message : "Something went wrong");

  const schedule = useMutation({
    mutationFn: ({ id, startNow }: { id: string; startNow: boolean }) => scheduleOnlineExam(id, startNow),
    onSuccess: (exam, vars) => {
      refresh();
      toast.success(vars.startNow ? `${exam.name} is open now` : `${exam.name} scheduled - students have been notified`);
      setPending(null);
    },
    onError,
  });
  const publish = useMutation({
    mutationFn: publishExamResults,
    onSuccess: (exam) => {
      refresh();
      toast.success(`Results published for ${exam.name}`);
      setPending(null);
    },
    onError,
  });
  const cancel = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => cancelOnlineExam(id, reason),
    onSuccess: (exam) => {
      refresh();
      toast.success(`${exam.name} cancelled`);
      setCancelTarget(null);
    },
    onError,
  });
  const remove = useMutation({
    mutationFn: deleteOnlineExam,
    onSuccess: () => {
      refresh();
      toast.success("Exam deleted");
      setPending(null);
      onDeleted?.();
    },
    onError,
  });
  const duplicate = useMutation({
    mutationFn: duplicateOnlineExam,
    onSuccess: (exam) => {
      refresh();
      toast.success("Copy created as a draft");
      navigate(`/online-exams/exams/${exam.id}/edit`);
    },
    onError,
  });

  const menuItems = (exam: OnlineExamListItem, { includeView = true }: { includeView?: boolean } = {}): ReactNode => {
    const can = allowedActions(exam);
    return (
      <>
        {includeView && (
          <DropdownMenuItem onClick={() => navigate(`/online-exams/exams/${exam.id}`)}>
            <Eye className="h-3.5 w-3.5" />
            View
          </DropdownMenuItem>
        )}
        {can.edit && (
          <DropdownMenuItem onClick={() => navigate(`/online-exams/exams/${exam.id}/edit`)}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </DropdownMenuItem>
        )}
        {can.schedule && (
          <>
            <DropdownMenuItem onClick={() => setPending({ kind: "schedule", exam })}>
              <CalendarCheck2 className="h-3.5 w-3.5" />
              Schedule
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setPending({ kind: "startNow", exam })}>
              <Rocket className="h-3.5 w-3.5" />
              Publish &amp; open now
            </DropdownMenuItem>
          </>
        )}
        {can.publish && (
          <DropdownMenuItem onClick={() => setPending({ kind: "publish", exam })}>
            <Send className="h-3.5 w-3.5" />
            Publish results
          </DropdownMenuItem>
        )}
        {can.results && (
          <DropdownMenuItem onClick={() => navigate(`/online-exams/exams/${exam.id}/results`)}>
            <Award className="h-3.5 w-3.5" />
            View results
          </DropdownMenuItem>
        )}
        {can.duplicate && (
          <DropdownMenuItem onClick={() => duplicate.mutate(exam.id)}>
            <Copy className="h-3.5 w-3.5" />
            Duplicate
          </DropdownMenuItem>
        )}
        {(can.cancel || can.delete) && <DropdownMenuSeparator />}
        {can.cancel && (
          <DropdownMenuItem onClick={() => { setReason(""); setCancelTarget(exam); }}>
            <XCircle className="h-3.5 w-3.5" />
            Cancel exam
          </DropdownMenuItem>
        )}
        {can.delete && (
          <DropdownMenuItem variant="destructive" onClick={() => setPending({ kind: "delete", exam })}>
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </DropdownMenuItem>
        )}
      </>
    );
  };

  const confirmCopy: Record<NonNullable<Pending>["kind"], { title: string; description: (e: OnlineExamListItem) => string; label: string }> = {
    schedule: {
      title: "Schedule this exam?",
      description: (e) => `${e.name} becomes visible to its ${e.assignedCount} student${e.assignedCount === 1 ? "" : "s"}, who are notified now and reminded before it opens. Questions can still be edited until someone starts.`,
      label: "Schedule exam",
    },
    startNow: {
      title: "Publish and open now?",
      description: (e) => `${e.name} opens immediately for its ${e.assignedCount} student${e.assignedCount === 1 ? "" : "s"}, with ${e.durationMinutes} minutes each once they start.`,
      label: "Open exam now",
    },
    publish: {
      title: "Publish results?",
      description: (e) => `Students will see their marks for ${e.name}${e.pendingEvaluationCount ? " - but some answers still need evaluation first" : ""}. They're notified straight away.`,
      label: "Publish results",
    },
    delete: {
      title: "Delete this exam?",
      description: (e) => `${e.name} and its questions will be removed. This can't be undone.`,
      label: "Delete exam",
    },
  };

  const busy = schedule.isPending || publish.isPending || remove.isPending;
  const dialogs = (
    <>
      {pending && (
        <ConfirmDialog
          open
          onOpenChange={(o) => !o && setPending(null)}
          title={confirmCopy[pending.kind].title}
          description={confirmCopy[pending.kind].description(pending.exam)}
          confirmLabel={confirmCopy[pending.kind].label}
          confirmVariant={pending.kind === "delete" ? "destructive" : "default"}
          submitting={busy}
          onConfirm={() => {
            const { kind, exam } = pending;
            if (kind === "delete") remove.mutate(exam.id);
            else if (kind === "publish") publish.mutate(exam.id);
            else schedule.mutate({ id: exam.id, startNow: kind === "startNow" });
          }}
        />
      )}
      <Dialog open={!!cancelTarget} onOpenChange={(o) => !o && setCancelTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {cancelTarget?.name}?</DialogTitle>
            <DialogDescription>
              Students can no longer start it, anyone writing it now is stopped (their answers are kept), and scheduled students are told it's cancelled.
            </DialogDescription>
          </DialogHeader>
          <FormField label="Reason" htmlFor="cancel-reason" optional hint="Included in the notification to students.">
            <Textarea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={500} />
          </FormField>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Keep exam
            </Button>
            <Button variant="destructive" loading={cancel.isPending} onClick={() => cancelTarget && cancel.mutate({ id: cancelTarget.id, reason })}>
              Cancel exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  return { menuItems, dialogs, openSchedule: (exam: OnlineExamListItem, startNow = false) => setPending({ kind: startNow ? "startNow" : "schedule", exam }), openPublish: (exam: OnlineExamListItem) => setPending({ kind: "publish", exam }) };
}
