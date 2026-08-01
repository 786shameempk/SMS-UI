import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/utils/cn";
import { formatDateTime } from "@/utils/format";
import { listMessageThreads, sendMessage } from "../api";

export default function MessagesTab({ studentId, teacherName }: { studentId: string; teacherName: string }) {
  const queryClient = useQueryClient();
  const { data: threads = [], isLoading } = useQuery({
    queryKey: ["parent-portal", "messages", studentId],
    queryFn: () => listMessageThreads(studentId, teacherName),
  });
  const [draft, setDraft] = useState("");

  const sendMutation = useMutation({
    mutationFn: ({ threadId, body }: { threadId: string; body: string }) => sendMessage(studentId, threadId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["parent-portal", "messages", studentId] });
      setDraft("");
    },
  });

  const thread = threads[0];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Teacher communication</CardTitle>
        <CardDescription>{thread ? `Conversation with ${thread.teacherName}` : "No conversations yet."}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading && <p className="text-sm text-muted-foreground">Loading messages…</p>}
        {thread && (
          <>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {thread.messages.map((m) => (
                <div key={m.id} className={cn("flex gap-2.5", m.sender === "parent" && "flex-row-reverse")}>
                  <Avatar className="w-7 h-7 shrink-0">
                    <AvatarFallback className="text-[10px]">{m.sender === "parent" ? "Me" : "T"}</AvatarFallback>
                  </Avatar>
                  <div className={cn("max-w-[75%] rounded-2xl px-3.5 py-2", m.sender === "parent" ? "bg-brand-500 text-white" : "bg-secondary")}>
                    <p className="text-sm">{m.body}</p>
                    <p className={cn("text-[10px] mt-1", m.sender === "parent" ? "text-white/70" : "text-slate-400")}>
                      {formatDateTime(m.sentAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-end gap-2 pt-2 border-t border-border">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={`Message ${thread.teacherName}...`}
                rows={2}
                className="flex-1"
              />
              <Button
                size="icon"
                disabled={!draft.trim() || sendMutation.isPending}
                onClick={() => sendMutation.mutate({ threadId: thread.id, body: draft.trim() })}
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
