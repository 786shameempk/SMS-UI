import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { listClasses } from "@/features/academics/api";
import { getMyChildren } from "@/features/parent-portal/api";
import ChildSwitcher from "@/features/parent-portal/components/ChildSwitcher";
import { isExamStaff } from "@/features/online-exams/constants";
import { useAuthStore } from "@/store/authStore";
import { askStudyAssistant } from "../../study/api";
import type { StudyMode, StudySource } from "../../study/types";
import AISourceReferences from "./AISourceReferences";

interface Turn {
  id: number;
  role: "user" | "assistant";
  text: string;
  sources?: StudySource[];
  usedMaterial?: boolean;
  notice?: string | null;
  error?: boolean;
}

const MODES: { value: StudyMode; label: string; prompt: string }[] = [
  { value: "Ask", label: "Ask", prompt: "" },
  { value: "Explain", label: "Explain", prompt: "Explain this topic: " },
  { value: "Summarize", label: "Summarize", prompt: "Summarize this chapter: " },
  { value: "Simple", label: "Simple words", prompt: "Explain in simple words: " },
  { value: "Examples", label: "Examples", prompt: "Give examples of: " },
  { value: "Flashcards", label: "Flashcards", prompt: "Make flashcards about: " },
  { value: "Quiz", label: "Quiz me", prompt: "Quiz me on: " },
];

let nextId = 0;

export default function StudyAssistantTab() {
  const user = useAuthStore((s) => s.user);
  const isParent = user?.role === "parent";
  const isStaff = isExamStaff(user?.role);

  const [mode, setMode] = useState<StudyMode>("Explain");
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [childId, setChildId] = useState<string | null>(null);
  const [classId, setClassId] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const { data: children = [] } = useQuery({
    queryKey: ["parent-portal", "children", user?.email],
    queryFn: () => getMyChildren(user!.email),
    enabled: isParent && Boolean(user?.email),
  });
  const { data: classes = [] } = useQuery({ queryKey: ["classes"], queryFn: listClasses, enabled: isStaff });
  const activeChild = childId ?? children[0]?.id;

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ behavior: "smooth", block: "end" });
  }, [turns]);

  const ask = useMutation({
    mutationFn: askStudyAssistant,
    onSuccess: (r) => {
      setConversationId(r.conversationId);
      setTurns((t) => [...t, { id: ++nextId, role: "assistant", text: r.answer, sources: r.sources, usedMaterial: r.usedMaterial, notice: r.notice }]);
    },
    onError: (e: Error) => setTurns((t) => [...t, { id: ++nextId, role: "assistant", text: e.message || "Something went wrong. Please try again.", error: true }]),
  });

  const send = () => {
    const message = draft.trim();
    if (!message || ask.isPending) return;
    setTurns((t) => [...t, { id: ++nextId, role: "user", text: message }]);
    setDraft("");
    ask.mutate({
      message, mode, conversationId,
      studentId: isParent ? activeChild : undefined,
      classId: isStaff && classId ? classId : undefined,
    });
  };

  return (
    <Card className="max-w-3xl">
      <CardContent className="space-y-4 pt-6">
        {isParent && (
          <ChildSwitcher students={children} selectedId={activeChild ?? null} onSelect={(id) => { setChildId(id); setConversationId(undefined); setTurns([]); }} />
        )}
        {isStaff && (
          <div className="max-w-xs">
            <Select value={classId} onValueChange={(v) => { setClassId(v === "__all" ? "" : v); setConversationId(undefined); }}>
              <SelectTrigger aria-label="Class to search">
                <SelectValue placeholder="All classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All classes</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5" role="group" aria-label="What would you like to do?">
          {MODES.map((m) => (
            <Button key={m.value} type="button" size="sm" variant={mode === m.value ? "default" : "outline"} aria-pressed={mode === m.value} onClick={() => { setMode(m.value); if (!draft && m.prompt) setDraft(m.prompt); }}>
              {m.label}
            </Button>
          ))}
        </div>

        <div className="min-h-48 max-h-[28rem] space-y-3 overflow-y-auto" role="log" aria-live="polite" aria-label="Study conversation">
          {turns.length === 0 && <p className="text-sm text-muted-foreground">Ask about a topic. Answers use your class study materials when they cover it, and show which pages they came from.</p>}
          {turns.map((t) => (
            <div key={t.id} className={t.role === "user" ? "flex justify-end" : "flex justify-start"}>
              <div className={t.role === "user" ? "max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground" : `max-w-[85%] rounded-lg border px-3 py-2 text-sm ${t.error ? "border-destructive" : "border-border"}`}>
                <p className="whitespace-pre-wrap">{t.text}</p>
                {t.notice && <p className="mt-1 text-xs text-muted-foreground">{t.notice}</p>}
                {t.role === "assistant" && !t.error && t.usedMaterial === false && (
                  <p className="mt-1 text-xs text-muted-foreground">Not found in your school materials, so this is a general explanation.</p>
                )}
                {t.sources && <AISourceReferences sources={t.sources} />}
              </div>
            </div>
          ))}
          {ask.isPending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Looking through your materials…
            </div>
          )}
          <div ref={bottom} />
        </div>

        <form className="flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
          <Textarea
            aria-label="Study question"
            rows={2}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
            placeholder="e.g. What is friction?"
          />
          <Button type="submit" disabled={!draft.trim() || ask.isPending}>
            <Send className="h-4 w-4" />
            Send
          </Button>
        </form>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Sparkles className="h-3 w-3" /> AI can make mistakes. Check important facts with your teacher or textbook.
        </p>
      </CardContent>
    </Card>
  );
}
