import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { History, Loader2, Plus, RotateCw, Send, Sparkles, Square } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ChildSwitcher from "@/features/parent-portal/components/ChildSwitcher";
import { getMyChildren } from "@/features/parent-portal/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { AI_MOCK_ENABLED, getConversation, sendAssistantMessage } from "../assistant/api";
import { CONVERSATIONS_KEY, SOURCE_LABELS, suggestedPrompts } from "../assistant/constants";
import { AssistantStreamError, streamAssistantMessage } from "../assistant/stream";
import type { AssistantChatRequest, AssistantMessage, AssistantMode, AssistantSource, ConversationSummary } from "../assistant/types";
import { useAiCapabilities } from "../capabilities";
import ConversationHistory from "./ConversationHistory";
import ActionCard from "./ActionCard";
import { ReadAloudButton, VoiceInputButton } from "./voice/VoiceButtons";
import { canRecord } from "../voice/support";

let nextId = 0;
const newId = () => `m${++nextId}`;

type Status = "idle" | "streaming";

interface Props {
  /** Fixed child for parents (e.g. the Parent Portal's selected child); hides the switcher. */
  studentId?: string;
  /** What the user is looking at, e.g. "Fees"; sent so answers can start from there. */
  page?: string;
  /** Shorter log for the floating panel. */
  compact?: boolean;
  /** "analytics": the admin analytics assistant (school-wide figures; the server allows admins only). */
  mode?: AssistantMode;
}

/**
 * Ask School AI: streamed answers (text appears as it is written, with a Stop button), conversation history, and a
 * child switcher for parents. Shared by the AI page, the floating launcher and the Parent Portal.
 */
export default function AssistantChat({ studentId, page, compact, mode = "chat" }: Props) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;
  const isParent = role === "parent" && mode === "chat";
  const { capabilities, can } = useAiCapabilities();
  const voiceIn = can("voice") && capabilities.speechToText && canRecord();
  const voiceOut = can("voice") && capabilities.textToSpeech;
  const [childId, setChildId] = useState<string | null>(null);
  const { data: children = [] } = useQuery({
    queryKey: ["parent-portal", "children", user?.email],
    queryFn: () => getMyChildren(user!.email),
    enabled: isParent && Boolean(user?.email) && !studentId,
  });
  const activeChildId = studentId ?? childId ?? children[0]?.id;
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [lookup, setLookup] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    bottomRef.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [messages, lookup]);

  // Leaving the page stops a running answer (the server cancels the provider call).
  useEffect(() => () => abort.current?.abort(), []);

  const startNew = () => {
    setConversationId(undefined);
    setMessages([]);
  };

  /** Reopens a past conversation so it can be continued; parents switch to the child it was about. */
  const openConversation = async (c: ConversationSummary) => {
    setOpening(true);
    try {
      const detail = await getConversation(c.id);
      if (isParent && c.studentId && !studentId) setChildId(c.studentId);
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

  const patch = (id: string, p: Partial<AssistantMessage>) => setMessages((m) => m.map((x) => (x.id === id ? { ...x, ...p } : x)));

  const ask = async (message: string, replyId: string) => {
    const req: AssistantChatRequest = { conversationId, message, studentId: isParent ? activeChildId : undefined, page };
    const controller = new AbortController();
    abort.current = controller;
    setStatus("streaming");
    let text = "";
    try {
      const res = capabilities.streaming || AI_MOCK_ENABLED
        ? await streamAssistantMessage(
            req,
            (e) => {
              if (e.type === "start") setConversationId(e.conversationId);
              else if (e.type === "delta") {
                text += e.text;
                setLookup(null);
                patch(replyId, { content: text });
              } else if (e.type === "reset") {
                text = "";
                patch(replyId, { content: "" });
              } else if (e.type === "lookup") setLookup(SOURCE_LABELS[e.source as AssistantSource] ?? e.source);
            },
            controller.signal,
            mode,
          )
        : await sendAssistantMessage(req, mode);
      setConversationId(res.conversationId);
      patch(replyId, { content: res.reply, sources: res.sources, demo: res.demo, pending: false, actions: res.actions });
      queryClient.invalidateQueries({ queryKey: CONVERSATIONS_KEY });
    } catch (err) {
      if (controller.signal.aborted) {
        patch(replyId, { content: text, pending: false, stopped: true });
      } else {
        const partial = err instanceof AssistantStreamError ? err.partial : text;
        if (err instanceof AssistantStreamError && err.conversationId) setConversationId(err.conversationId);
        patch(replyId, { content: partial, pending: false, error: true, errorText: err instanceof Error ? err.message : "Something went wrong. Please try again.", retry: message });
      }
    } finally {
      abort.current = null;
      setStatus("idle");
      setLookup(null);
    }
  };

  const send = (text: string) => {
    const message = text.trim();
    if (!message || status !== "idle") return;
    const replyId = newId();
    setMessages((m) => [...m, { id: newId(), role: "user", content: message }, { id: replyId, role: "assistant", content: "", pending: true }]);
    setDraft("");
    void ask(message, replyId);
  };

  const retry = (m: AssistantMessage) => {
    if (!m.retry || status !== "idle") return;
    patch(m.id, { content: "", pending: true, error: false, errorText: undefined, stopped: false });
    void ask(m.retry, m.id);
  };

  const busy = status !== "idle";

  return (
    <div className="space-y-4">
      {!AI_MOCK_ENABLED && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => setHistoryOpen((o) => !o)} aria-expanded={historyOpen}>
            {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <History className="h-3.5 w-3.5" />}
            History
          </Button>
          <Button variant="outline" size="sm" onClick={startNew} disabled={messages.length === 0 || busy}>
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
          feature={mode}
          childName={isParent ? (id) => children.find((c) => c.id === id)?.firstName : undefined}
        />
      )}
      {isParent && !studentId && (
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
      <div className={cn("space-y-3 overflow-y-auto", compact ? "min-h-48 max-h-[50vh]" : "min-h-64 max-h-[28rem]")} role="log" aria-live="polite" aria-label="Conversation">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {mode === "analytics"
                ? "Ask about fee collection, attendance, exam results by class, admissions or at-risk students. Figures come from the school system and cover only what your account can see."
                : "Ask about timetable, attendance, fees, exams or notices. Answers use only the data your account can access."}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedPrompts(role, mode).map((p) => (
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
                    : cn("max-w-[85%] rounded-lg border px-3 py-2 text-sm text-foreground", m.error ? "border-destructive" : "border-border")
                }
              >
                {m.content && <p className="whitespace-pre-wrap">{m.content}</p>}
                {m.pending && !m.content && (
                  <span className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {lookup ? `Checking ${lookup.toLowerCase()}…` : "Thinking…"}
                  </span>
                )}
                {m.pending && m.content && <span className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-sm bg-foreground/60 align-middle" aria-hidden="true" />}
                {voiceOut && m.role === "assistant" && !m.pending && !m.error && m.content && <ReadAloudButton text={m.content} />}
                {m.demo && <p className="mt-1 text-xs text-muted-foreground">Demo mode</p>}
                {m.stopped && <p className="mt-1 text-xs text-muted-foreground">Stopped. This answer is incomplete.</p>}
                {m.error && (
                  <div className="mt-1 space-y-1.5">
                    <p className="text-xs text-destructive">{m.errorText}</p>
                    {m.retry && (
                      <Button type="button" size="sm" variant="outline" onClick={() => retry(m)} disabled={busy}>
                        <RotateCw className="h-3.5 w-3.5" /> Retry
                      </Button>
                    )}
                  </div>
                )}
                {m.actions?.map((a) => <ActionCard key={a.id} action={a} />)}
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
          placeholder={mode === "analytics" ? "Ask about school analytics…" : "Ask School AI…"}
          rows={2}
        />
        {voiceIn && !busy && <VoiceInputButton onText={(t) => setDraft((d) => (d.trim() ? `${d.trim()} ${t}` : t))} />}
        {busy ? (
          <Button type="button" variant="outline" onClick={() => abort.current?.abort()}>
            <Square className="h-4 w-4" />
            Stop
          </Button>
        ) : (
          <Button type="submit" disabled={!draft.trim()}>
            <Send className="h-4 w-4" />
            Send
          </Button>
        )}
      </form>
      <p className="flex items-center gap-1 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" /> AI can make mistakes. Check important details with the school office.
      </p>
    </div>
  );
}
