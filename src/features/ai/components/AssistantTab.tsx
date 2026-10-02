import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, Plus, Send, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import ChildSwitcher from "@/features/parent-portal/components/ChildSwitcher";
import { getMyChildren } from "@/features/parent-portal/api";
import { useAuthStore } from "@/store/authStore";
import { AI_MOCK_ENABLED, getConversation, sendAssistantMessage } from "../assistant/api";
import { CONVERSATIONS_KEY, SOURCE_LABELS, suggestedPrompts } from "../assistant/constants";
import type { AssistantMessage, AssistantSource, ConversationSummary } from "../assistant/types";
import ConversationHistory from "./ConversationHistory";

let nextId = 0;
const newId = () => `m${++nextId}`;

export default function AssistantTab() {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isParent = role === "parent";
  const [childId, setChildId] = useState<string | null>(null);
  const { data: children = [] } = useQuery({
    queryKey: ["parent-portal", "children", user?.email],
    queryFn: () => getMyChildren(user!.email),
    enabled: isParent && Boolean(user?.email),
  });
  const activeChildId = childId ?? children[0]?.id;
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  const startNew = () => {
    setConversationId(undefined);
    setMessages([]);
  };

  /** Reopens a past conversation so it can be continued; parents switch to the child it was about. */
  const openConversation = async (c: ConversationSummary) => {
    setOpening(true);
    try {
      const detail = await getConversation(c.id);
      if (isParent && c.studentId) setChildId(c.studentId);
      setConversationId(c.id);
      setMessages(
        detail.messages.map((m) => ({
          id: newId(),
          role: m.role,
          content: m.content,
          sources: m.sources.filter((s): s is AssistantSource => s in SOURCE_LABELS),
        })),
      );
      setHistoryOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not open that conversation.");
    } finally {
      setOpening(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages]);

  const mutation = useMutation({
    mutationFn: sendAssistantMessage,
    onSuccess: (res) => {
      setConversationId(res.conversationId);
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
      setMessages((m) => [...m, { id: newId(), role: "assistant", content: res.reply, sources: res.sources, demo: res.demo }]);
    },
    onError: (err: Error) => {
      setMessages((m) => [...m, { id: newId(), role: "assistant", content: err.message || "Something went wrong. Please try again.", error: true }]);
    },
  });

  const send = (text: string) => {
    const message = text.trim();
    if (!message || mutation.isPending) return;
    setMessages((m) => [...m, { id: newId(), role: "user", content: message }]);
    setDraft("");
    mutation.mutate({ conversationId, message, studentId: isParent ? activeChildId : undefined });
  };

  return (
    <Card className="max-w-3xl">
      <CardContent className="space-y-4 pt-6">
        {!AI_MOCK_ENABLED && (
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setHistoryOpen((o) => !o)} aria-expanded={historyOpen}>
              {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
              History
            </Button>
            <Button variant="outline" size="sm" onClick={startNew} disabled={messages.length === 0 || mutation.isPending}>
              <Plus className="h-3.5 w-3.5" />
              New chat
            </Button>
          </div>
        )}
        {historyOpen && (
          <ConversationHistory
            activeId={conversationId}
            onOpen={openConversation}
            onDeleted={(id) => id === conversationId && startNew()}
            childName={isParent ? (id) => children.find((c) => c.id === id)?.firstName : undefined}
          />
        )}
        {isParent && (
          <ChildSwitcher
            students={children}
            selectedId={activeChildId ?? null}
            onSelect={(id) => {
              setChildId(id);
              setConversationId(undefined);
              setMessages([]);
            }}
          />
        )}
        <div className="min-h-64 max-h-[28rem] overflow-y-auto space-y-3" role="log" aria-live="polite" aria-label="Conversation">
          {messages.length === 0 ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Ask about timetable, attendance, fees, exams or notices. Answers use only the data your account can access.</p>
              <div className="flex flex-wrap gap-2">
                {suggestedPrompts(role).map((p) => (
                  <Button key={p} variant="outline" size="sm" onClick={() => send(p)}>
                    {p}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={
                    m.role === "user"
                      ? "max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground"
                      : `max-w-[85%] rounded-lg border px-3 py-2 text-sm text-foreground ${m.error ? "border-destructive" : "border-border"}`
                  }
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.demo && <p className="mt-1 text-xs text-muted-foreground">Demo mode</p>}
                  {m.sources && m.sources.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <span className="text-xs text-muted-foreground">Based on:</span>
                      {m.sources.map((s) => (
                        <Badge key={s} variant="neutral">
                          {SOURCE_LABELS[s]}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
          {mutation.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Thinking…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(draft);
          }}
        >
          <Textarea
            aria-label="Message"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(draft);
              }
            }}
            placeholder="Ask School AI…"
            rows={2}
          />
          <Button type="submit" disabled={!draft.trim() || mutation.isPending}>
            <Send className="w-4 h-4" />
            Send
          </Button>
        </form>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="w-3 h-3" /> AI can make mistakes. Check important details with the school office.
        </p>
      </CardContent>
    </Card>
  );
}
