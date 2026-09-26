import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Send } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/utils/format";
import { addDiscussionComment, listDiscussionComments } from "../api";

export default function DiscussionThread({
  resourceId,
  authorName,
  authorRole,
}: {
  resourceId: string;
  authorName: string;
  authorRole: string;
}) {
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ["homework", "discussion", resourceId],
    queryFn: () => listDiscussionComments(resourceId),
  });

  const postMutation = useMutation({
    mutationFn: () => addDiscussionComment(resourceId, { authorName, authorRole, text: text.trim() }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["homework", "discussion", resourceId] });
      setText("");
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not post comment"),
  });

  return (
    <div className="space-y-3">
      <div className="space-y-2.5 max-h-72 overflow-y-auto">
        {isLoading && <p className="text-sm text-muted-foreground">Loading discussion…</p>}
        {!isLoading && comments.length === 0 && <p className="text-sm text-muted-foreground">No comments yet — start the discussion.</p>}
        {comments.map((c) => (
          <div key={c.id} className="rounded-lg border border-border p-2.5">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-foreground">
                {c.authorName} <span className="text-xs text-muted-foreground font-normal">· {c.authorRole}</span>
              </p>
              <p className="text-xs text-muted-foreground shrink-0">{formatDateTime(c.postedAt)}</p>
            </div>
            <p className="text-sm text-secondary-foreground mt-1">{c.text}</p>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-2">
        <Textarea
          rows={2}
          placeholder="Add a comment…"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="flex-1"
        />
        <Button size="icon" disabled={!text.trim() || postMutation.isPending} onClick={() => postMutation.mutate()}>
          {postMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
