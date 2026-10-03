import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, ClipboardCheck, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cancelAction, confirmAction } from "../assistant/api";
import type { ProposedAction } from "../assistant/types";

const TITLE: Record<string, string> = {
  propose_leave_request: "Leave application",
  propose_notice_draft: "Draft notice",
  propose_teacher_message: "Message to class teacher",
  propose_homework_draft: "Draft homework",
};

/**
 * Something the assistant prepared. It only happens if the user presses Confirm; the server then checks access
 * again and runs it once. Cancel discards it.
 */
export default function ActionCard({ action }: { action: ProposedAction }) {
  const [state, setState] = useState(action);
  const confirm = useMutation({ mutationFn: () => confirmAction(action.id), onSuccess: setState });
  const cancel = useMutation({ mutationFn: () => cancelAction(action.id), onSuccess: setState });
  const busy = confirm.isPending || cancel.isPending;
  const error = confirm.error ?? cancel.error;

  return (
    <div role="group" aria-label={TITLE[action.kind] ?? "Prepared action"} className="mt-2 space-y-2 rounded-md border border-border bg-secondary/40 p-2.5 text-sm">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <ClipboardCheck className="h-3.5 w-3.5" aria-hidden="true" /> {TITLE[action.kind] ?? "Prepared action"}
      </p>
      <p className="text-foreground">{state.status === "Completed" ? state.summary : action.summary}</p>
      {state.status === "Pending" ? (
        <>
          <p className="text-xs text-muted-foreground">Nothing has been sent yet. Check the details, then confirm.</p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => confirm.mutate()} disabled={busy}>
              {confirm.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />} Confirm
            </Button>
            <Button size="sm" variant="ghost" onClick={() => cancel.mutate()} disabled={busy}>
              <X className="h-3.5 w-3.5" /> Cancel
            </Button>
          </div>
        </>
      ) : (
        <p className={state.status === "Completed" ? "text-xs text-success" : "text-xs text-muted-foreground"} role="status">
          {state.status === "Completed" ? "Done." : state.status === "Cancelled" ? "Cancelled. Nothing was sent." : `This action is ${state.status.toLowerCase()}.`}
        </p>
      )}
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error.message}
        </p>
      )}
    </div>
  );
}
