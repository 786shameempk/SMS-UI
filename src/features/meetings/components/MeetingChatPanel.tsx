import { useEffect, useRef, useState } from "react";
import { HubConnectionBuilder, LogLevel, type HubConnection } from "@microsoft/signalr";
import toast from "react-hot-toast";
import { Megaphone, MessageSquareOff, Pin, PinOff, SendHorizontal, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { MEETING_API_BASE_URL } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { deleteChat, listChat, pinChat, postChat, toggleChat } from "../api";
import type { ChatMessage } from "../types";
import { formatTime } from "../utils";

interface MeetingChatPanelProps {
  meetingId: string;
  isHost: boolean;
  canChat: boolean;
  onClose: () => void;
}

/**
 * Persistent, moderated chat (design section 16). History comes over REST; new messages arrive through the
 * SignalR hub, which only lets people who pass the meeting's access check into its group.
 */
export default function MeetingChatPanel({ meetingId, isHost, canChat: initialCanChat, onClose }: MeetingChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [announce, setAnnounce] = useState(false);
  const [chatOn, setChatOn] = useState(initialCanChat || isHost);
  const [sending, setSending] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
  const connection = useRef<HubConnection | null>(null);

  useEffect(() => {
    let disposed = false;
    listChat(meetingId).then((history) => !disposed && setMessages(history)).catch(() => undefined);

    const hub = new HubConnectionBuilder()
      .withUrl(new URL("hubs/meeting-chat", MEETING_API_BASE_URL).toString(), { accessTokenFactory: () => useAuthStore.getState().token ?? "" })
      .withAutomaticReconnect()
      .configureLogging(LogLevel.Warning)
      .build();
    // The hub broadcasts one copy to everyone, so "mine" is decided here, not by the server.
    const myId = useAuthStore.getState().user?.id;
    hub.on("messagePosted", (m: ChatMessage) =>
      setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, { ...m, isMine: m.senderUserId === myId }])));
    hub.on("messageChanged", ({ messageId, isPinned, deleted }: { messageId: string; isPinned: boolean | null; deleted: boolean }) =>
      setMessages((prev) => (deleted ? prev.filter((m) => m.id !== messageId) : prev.map((m) => (m.id === messageId && isPinned !== null ? { ...m, isPinned } : m)))));
    hub.on("chatToggled", ({ enabled }: { enabled: boolean }) => setChatOn(enabled || isHost));
    hub.onreconnected(() => hub.invoke("JoinMeeting", meetingId).catch(() => undefined));
    hub
      .start()
      .then(() => hub.invoke("JoinMeeting", meetingId))
      .catch(() => !disposed && toast.error("Live chat couldn't connect. Messages will still send."));
    connection.current = hub;
    return () => {
      disposed = true;
      void hub.stop();
    };
  }, [meetingId, isHost]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setSending(true);
    try {
      const sent = await postChat(meetingId, body, announce);
      setMessages((prev) => (prev.some((x) => x.id === sent.id) ? prev : [...prev, sent]));
      setText("");
      setAnnounce(false);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(false);
    }
  };

  const pinned = messages.filter((m) => m.isPinned);

  return (
    <aside className="flex h-full w-full flex-col bg-card text-foreground" aria-label="Chat">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold">Chat</h2>
        <div className="flex items-center gap-2">
          {isHost && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              Students can chat
              <Switch
                id="chat-enabled"
                checked={chatOn}
                onCheckedChange={(v) => {
                  setChatOn(v);
                  toggleChat(meetingId, v).catch((err: Error) => toast.error(err.message));
                }}
              />
            </label>
          )}
          <Button size="icon" variant="ghost" onClick={onClose} aria-label="Close chat"><X className="h-4 w-4" /></Button>
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="space-y-1 border-b border-border bg-brand-50 px-4 py-2 dark:bg-brand-900/20">
          {pinned.map((m) => (
            <p key={m.id} className="flex items-start gap-2 text-xs text-foreground">
              <Pin className="mt-0.5 h-3 w-3 shrink-0 text-brand-600" aria-hidden />
              <span><strong>{m.senderName}:</strong> {m.body}</span>
            </p>
          ))}
        </div>
      )}

      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
        {messages.length === 0 && <p className="pt-8 text-center text-sm text-muted-foreground">No messages yet. Say hello!</p>}
        {messages.map((m) => (
          <div key={m.id} className={cn("group flex flex-col", m.isMine ? "items-end" : "items-start")}>
            <span className="mb-0.5 text-[11px] text-muted-foreground">{m.isMine ? "You" : m.senderName} · {formatTime(m.sentAt)}</span>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                m.kind === "Announcement"
                  ? "border border-brand-300 bg-brand-100 text-brand-900 dark:border-brand-700 dark:bg-brand-900/40 dark:text-brand-100"
                  : m.isMine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
              )}
            >
              {m.kind === "Announcement" && <Megaphone className="mr-1 inline h-3.5 w-3.5" aria-label="Announcement" />}
              {m.body}
            </div>
            {isHost && (
              <div className="mt-0.5 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button type="button" className="rounded p-1 text-muted-foreground hover:bg-secondary cursor-pointer" aria-label={m.isPinned ? "Unpin" : "Pin"}
                  onClick={() => pinChat(meetingId, m.id, !m.isPinned).catch((err: Error) => toast.error(err.message))}>
                  {m.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                </button>
                <button type="button" className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-red-600 cursor-pointer" aria-label="Delete message"
                  onClick={() => deleteChat(meetingId, m.id).catch((err: Error) => toast.error(err.message))}>
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {chatOn ? (
        <form
          className="space-y-2 border-t border-border p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          {isHost && (
            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" checked={announce} onChange={(e) => setAnnounce(e.target.checked)} className="accent-[var(--color-primary)]" />
              Send as announcement (pinned for everyone)
            </label>
          )}
          <div className="flex gap-2">
            <input
              id="chat-message"
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              placeholder="Type a message"
              autoComplete="off"
              className="h-10 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <Button type="submit" size="icon" disabled={sending || !text.trim()} aria-label="Send"><SendHorizontal className="h-4 w-4" /></Button>
          </div>
        </form>
      ) : (
        <p className="flex items-center justify-center gap-2 border-t border-border p-4 text-sm text-muted-foreground">
          <MessageSquareOff className="h-4 w-4" aria-hidden /> The host has turned chat off.
        </p>
      )}
    </aside>
  );
}
