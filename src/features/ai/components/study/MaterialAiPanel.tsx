import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import { Textarea } from "@/components/ui/textarea";
import { askStudyAssistant, getMaterialIndex, indexMaterial, isAiReadableFile } from "../../study/api";
import type { AiDocument, StudyMode, StudyResponse } from "../../study/types";
import AISourceReferences from "./AISourceReferences";

const MODES: { value: StudyMode; label: string }[] = [
  { value: "Ask", label: "Ask" },
  { value: "Explain", label: "Explain" },
  { value: "Summarize", label: "Summarize" },
  { value: "Simple", label: "Simple words" },
  { value: "Flashcards", label: "Flashcards" },
  { value: "Quiz", label: "Quiz me" },
];

const PENDING: AiDocument["status"][] = ["Queued", "Processing"];

const materialIndexKey = (materialId: string) => ["ai", "material-index", materialId] as const;

/**
 * "Ask AI about this material": answers come from this material only, with page citations. The server checks with
 * AcademicService that the viewer may see it on every question. Staff can prepare (index) the file here.
 */
export default function MaterialAiPanel({ materialId, fileName, canPrepare }: { materialId: string; fileName?: string; canPrepare: boolean }) {
  const { t } = useTranslation("ai");
  const queryClient = useQueryClient();
  const readable = isAiReadableFile(fileName);
  const index = useQuery({
    queryKey: materialIndexKey(materialId),
    queryFn: () => getMaterialIndex(materialId),
    enabled: readable,
    refetchInterval: (q) => (q.state.data && PENDING.includes(q.state.data.status) ? 3000 : false),
  });
  const [mode, setMode] = useState<StudyMode>("Ask");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<StudyResponse | null>(null);
  const [conversationId, setConversationId] = useState<string>();

  const prepare = useMutation({
    mutationFn: (rebuild: boolean) => indexMaterial(materialId, rebuild),
    onSuccess: (doc) => {
      queryClient.setQueryData(materialIndexKey(materialId), doc);
      toast.success(t("Preparing this material for AI…"));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const ask = useMutation({
    mutationFn: () => askStudyAssistant({ message: question.trim(), mode, materialId, conversationId }),
    onSuccess: (r) => {
      setAnswer(r);
      setConversationId(r.conversationId);
    },
  });

  if (!readable) {
    return <p className="text-sm text-muted-foreground">{fileName ? t("AI can read uploaded PDF, Word, PowerPoint and text files. This material is another file type.") : t("AI can read uploaded PDF, Word, PowerPoint and text files. This material is a link.")}</p>;
  }
  if (index.isLoading) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> {t("Checking AI status…")}
      </p>
    );
  }
  if (index.isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {index.error.message}
      </p>
    );
  }

  const doc = index.data;
  if (!doc || doc.status === "Failed") {
    return (
      <div className="space-y-2">
        {doc ? (
          <div className="flex items-center gap-2 text-sm">
            <StatusBadge status="failed" label={t("Couldn't be read")} />
            <span className="text-muted-foreground">{t("Scanned PDFs need OCR, which this school's AI setup may not include.")}</span>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">{canPrepare ? t("This material isn't ready for AI questions yet.") : t("Your teacher hasn't enabled AI questions for this material yet.")}</p>
        )}
        {canPrepare && (
          <Button size="sm" onClick={() => prepare.mutate(Boolean(doc))} disabled={prepare.isPending}>
            {prepare.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            {doc ? t("Try again") : t("Prepare for AI")}
          </Button>
        )}
      </div>
    );
  }

  if (PENDING.includes(doc.status)) {
    return (
      <div className="space-y-2" aria-live="polite">
        <div className="flex items-center gap-2 text-sm">
          <StatusBadge status="processing" label={t("Preparing for AI")} />
          <span className="text-muted-foreground">{t("Reading the file. This usually takes under a minute.")}</span>
        </div>
        <div className="h-1.5 w-full max-w-sm overflow-hidden rounded-full bg-muted" role="progressbar" aria-label={t("Preparing for AI")} aria-valuenow={doc.progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-primary transition-all" style={{ width: `${Math.max(doc.progress, 5)}%` }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <StatusBadge status="ready" label={t("Ready for AI")} variant="success" />
          <span className="text-muted-foreground">{doc.pageCount === 1 ? t("1 page read") : t("{{count}} pages read", { count: doc.pageCount })}</span>
        </div>
        {canPrepare && (
          <Button size="sm" variant="ghost" onClick={() => prepare.mutate(true)} disabled={prepare.isPending} title={t("Re-read the file, e.g. after replacing it")}>
            <RefreshCw className="h-3.5 w-3.5" /> {t("Refresh")}
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={t("What would you like to do?")}>
        {MODES.map((m) => (
          <Button key={m.value} type="button" size="sm" variant={mode === m.value ? "default" : "outline"} aria-pressed={mode === m.value} onClick={() => setMode(m.value)}>
            {t(m.label)}
          </Button>
        ))}
      </div>
      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim() && !ask.isPending) ask.mutate();
        }}
      >
        <Textarea aria-label={t("Question about this material")} rows={2} value={question} onChange={(e) => setQuestion(e.target.value)} placeholder={t("e.g. Explain the difference between proper and improper fractions.")} />
        <Button type="submit" disabled={!question.trim() || ask.isPending}>
          {ask.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {t("Send")}
        </Button>
      </form>
      {ask.isError && (
        <p role="alert" className="text-sm text-destructive">
          {ask.error.message}
        </p>
      )}
      {answer && (
        <div className="rounded-lg border border-border p-3 text-sm" aria-label={t("AI answer")}>
          <p className="whitespace-pre-wrap">{answer.answer}</p>
          {!answer.usedMaterial && <p className="mt-1 text-xs text-muted-foreground">{t("This wasn't found in the material, so this is a general explanation.")}</p>}
          <AISourceReferences sources={answer.sources} />
        </div>
      )}
      <p className="text-xs text-muted-foreground">{t("AI can make mistakes. Check important facts with your teacher or the material itself.")}</p>
    </div>
  );
}
