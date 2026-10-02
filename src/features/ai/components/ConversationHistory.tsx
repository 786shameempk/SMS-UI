import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, MessageSquare, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import ConfirmDialog from "@/components/dialogs/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { deleteConversation, listConversations } from "../assistant/api";
import { CONVERSATIONS_KEY } from "../assistant/constants";
import type { ConversationSummary } from "../assistant/types";

function when(iso: string) {
  const d = new Date(iso);
  const sameDay = d.toDateString() === new Date().toDateString();
  return sameDay ? d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" }) : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

/** The signed-in user's past Ask School AI conversations: reopen one to continue it, or delete it. */
export default function ConversationHistory({
  activeId,
  onOpen,
  onDeleted,
  childName,
}: {
  activeId?: string;
  onOpen: (conversation: ConversationSummary) => void;
  onDeleted: (id: string) => void;
  /** For parents: which child a conversation was about. */
  childName?: (studentId: string) => string | undefined;
}) {
  const queryClient = useQueryClient();
  const [toDelete, setToDelete] = useState<ConversationSummary | null>(null);
  const conversations = useQuery({ queryKey: CONVERSATIONS_KEY, queryFn: () => listConversations() });

  const remove = useMutation({
    mutationFn: deleteConversation,
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      onDeleted(id);
      setToDelete(null);
      toast.success("Conversation deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="rounded-lg border border-border">
      {conversations.isLoading ? (
        <p className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading conversations…
        </p>
      ) : conversations.isError ? (
        <p className="p-3 text-sm text-destructive">{(conversations.error as Error).message}</p>
      ) : !conversations.data?.length ? (
        <p className="p-3 text-sm text-muted-foreground">No earlier conversations yet.</p>
      ) : (
        <ul className="max-h-60 divide-y divide-border overflow-y-auto" aria-label="Earlier conversations">
          {conversations.data.map((c) => {
            const child = c.studentId ? childName?.(c.studentId) : undefined;
            return (
              <li key={c.id} className={cn("flex items-center gap-2 px-3 py-2", c.id === activeId && "bg-accent")}>
                <button type="button" className="flex min-w-0 flex-1 items-start gap-2 text-left" onClick={() => onOpen(c)} aria-current={c.id === activeId ? "true" : undefined}>
                  <MessageSquare className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm">{c.title || "Untitled conversation"}</span>
                    <span className="block text-xs text-muted-foreground">
                      {when(c.updatedAt)}
                      {child && ` · ${child}`}
                    </span>
                  </span>
                </button>
                <Button variant="ghost" size="icon-sm" aria-label={`Delete conversation: ${c.title}`} onClick={() => setToDelete(c)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(v) => !v && setToDelete(null)}
        title="Delete conversation"
        description={`"${toDelete?.title}" and all its messages will be deleted.`}
        confirmLabel="Delete"
        confirmVariant="destructive"
        submitting={remove.isPending}
        onConfirm={() => {
          if (toDelete) remove.mutate(toDelete.id);
        }}
      />
    </div>
  );
}
