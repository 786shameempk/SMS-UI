import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, Award, Bookmark, BookmarkCheck, CheckCircle2, Clock, CloudOff, Eraser, Loader2, Send, TimerOff } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/utils/cn";
import { getExamSession, OnlineExamApiError, saveAnswers, startExam, submitExam } from "../api";
import { formatMarks, isExamStudent, QUESTION_TYPE_LABEL } from "../constants";
import type { AnswerInput, AttemptQuestion, AttemptSession, SubmitResult } from "../types";

type Phase = { kind: "loading" } | { kind: "error"; title: string; message: string } | { kind: "taking" } | { kind: "submitted"; result: SubmitResult | null; timedOut: boolean };
type SaveState = "saved" | "saving" | "retrying";

const AUTOSAVE_DELAY = 1500;
const LONG_ANSWER_LIMIT = 10000;

const hasResponse = (a?: AnswerInput) => !!a && (a.selectedOptionIds.length > 0 || !!a.textAnswer?.trim());
const blank = (questionId: string): AnswerInput => ({ questionId, selectedOptionIds: [], textAnswer: null, markedForReview: false });

function formatClock(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

function QuestionBody({ q, answer, onChange }: { q: AttemptQuestion; answer: AnswerInput; onChange: (a: AnswerInput) => void }) {
  if (q.type === "SingleChoice" || q.type === "TrueFalse") {
    return (
      <div role="radiogroup" aria-label="Choose one answer" className="grid gap-2">
        {q.options.map((o, i) => {
          const checked = answer.selectedOptionIds[0] === o.id;
          return (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                checked ? "border-primary bg-accent/70 font-medium text-foreground" : "border-border/80 hover:border-primary/40 hover:bg-secondary/40",
              )}
            >
              <input type="radio" name={`q-${q.id}`} className="sr-only" checked={checked} onChange={() => onChange({ ...answer, selectedOptionIds: [o.id] })} />
              <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold", checked ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground")}>
                {q.type === "TrueFalse" ? (i === 0 ? "T" : "F") : String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{o.text}</span>
            </label>
          );
        })}
      </div>
    );
  }
  if (q.type === "MultipleSelect") {
    return (
      <div className="grid gap-2" role="group" aria-label="Choose all that apply">
        <p className="text-xs text-muted-foreground">Select all that apply.</p>
        {q.options.map((o, i) => {
          const checked = answer.selectedOptionIds.includes(o.id);
          return (
            <label
              key={o.id}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
                checked ? "border-primary bg-accent/70 font-medium text-foreground" : "border-border/80 hover:border-primary/40 hover:bg-secondary/40",
              )}
            >
              <Checkbox
                checked={checked}
                onCheckedChange={(c) => onChange({ ...answer, selectedOptionIds: c === true ? [...answer.selectedOptionIds, o.id] : answer.selectedOptionIds.filter((x) => x !== o.id) })}
              />
              <span className="w-5 text-xs font-semibold text-muted-foreground">{String.fromCharCode(65 + i)}</span>
              <span className="flex-1">{o.text}</span>
            </label>
          );
        })}
      </div>
    );
  }
  if (q.type === "FillInBlank") {
    return (
      <Input
        value={answer.textAnswer ?? ""}
        onChange={(e) => onChange({ ...answer, textAnswer: e.target.value })}
        placeholder="Type your answer"
        maxLength={500}
        aria-label="Your answer"
        className="max-w-md"
      />
    );
  }
  const long = q.type === "LongAnswer";
  const length = answer.textAnswer?.length ?? 0;
  return (
    <div className="space-y-1">
      <Textarea
        rows={long ? 10 : 4}
        value={answer.textAnswer ?? ""}
        onChange={(e) => onChange({ ...answer, textAnswer: e.target.value })}
        placeholder={long ? "Write your answer in detail" : "Write a short answer"}
        maxLength={long ? LONG_ANSWER_LIMIT : 2000}
        aria-label="Your answer"
      />
      <p className="text-right text-xs tabular-nums text-muted-foreground">
        {length.toLocaleString()} / {(long ? LONG_ANSWER_LIMIT : 2000).toLocaleString()}
      </p>
    </div>
  );
}

export default function TakeExamPage() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const role = useAuthStore((s) => s.user?.role);
  const wantsStart = (location.state as { start?: boolean } | null)?.start === true;

  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [session, setSession] = useState<AttemptSession | null>(null);
  const [answers, setAnswers] = useState<Record<string, AnswerInput>>({});
  const [index, setIndex] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [unsaved, setUnsaved] = useState(0);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const answersRef = useRef(answers);
  answersRef.current = answers;
  const dirty = useRef<Set<string>>(new Set());
  const saving = useRef(false);
  const saveTimer = useRef<number | undefined>(undefined);
  const retryDelay = useRef(2000);
  const offset = useRef(0); // server clock - local clock
  const finished = useRef(false);
  const warned = useRef<Set<number>>(new Set());
  const lastAutoSubmit = useRef(0);

  // ── load (resume, or start if we came from the Start button) ──
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const open = (s: AttemptSession) => {
      if (cancelled) return;
      offset.current = Date.parse(s.serverNowUtc) - Date.now();
      setSession(s);
      const initial: Record<string, AnswerInput> = {};
      for (const q of s.questions) initial[q.id] = blank(q.id);
      for (const a of s.answers) initial[a.questionId] = { ...a, textAnswer: a.textAnswer ?? null };
      setAnswers(initial);
      // Resume at the first unanswered question.
      const firstOpen = s.questions.findIndex((q) => !hasResponse(initial[q.id]));
      const start = Math.max(0, firstOpen);
      setIndex(start);
      setFurthest(start);
      setPhase({ kind: "taking" });
    };
    (async () => {
      try {
        open(await getExamSession(id));
      } catch (err) {
        const status = err instanceof OnlineExamApiError ? err.status : undefined;
        if (status === 404 && wantsStart) {
          try {
            open(await startExam(id));
            // Drop the "start" flag so a refresh resumes rather than starting a new attempt.
            navigate(location.pathname, { replace: true, state: null });
          } catch (e) {
            if (!cancelled) setPhase({ kind: "error", title: "You can't start this exam", message: e instanceof Error ? e.message : "Please try again." });
          }
          return;
        }
        if (cancelled) return;
        if (status === 409) setPhase({ kind: "submitted", result: null, timedOut: true });
        else if (status === 404) setPhase({ kind: "error", title: "No exam in progress", message: "Start the exam from My exams." });
        else setPhase({ kind: "error", title: "The exam couldn't load", message: err instanceof Error ? err.message : "Check your connection and try again." });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const finish = useCallback(
    (result: SubmitResult | null, timedOut: boolean) => {
      finished.current = true;
      window.clearTimeout(saveTimer.current);
      void queryClient.invalidateQueries({ queryKey: ["online-exams"] });
      setConfirmOpen(false);
      setPhase({ kind: "submitted", result, timedOut });
    },
    [queryClient],
  );

  // ── autosave ──
  const flush = useCallback(async () => {
    if (!id || saving.current || finished.current || dirty.current.size === 0) return;
    const ids = [...dirty.current];
    dirty.current = new Set();
    const payload = ids.map((qid) => answersRef.current[qid]).filter(Boolean);
    saving.current = true;
    setSaveState("saving");
    try {
      const res = await saveAnswers(id, payload);
      offset.current = Date.parse(res.serverNowUtc) - Date.now();
      retryDelay.current = 2000;
      setSaveState(dirty.current.size ? "saving" : "saved");
    } catch (err) {
      for (const qid of ids) dirty.current.add(qid);
      if (err instanceof OnlineExamApiError && err.status === 409) {
        finish(null, true);
        return;
      }
      // Keep the answers and retry with backoff (2s, 4s, … 30s) until the connection is back.
      setSaveState("retrying");
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void flush(), retryDelay.current);
      retryDelay.current = Math.min(retryDelay.current * 2, 30000);
      return;
    } finally {
      saving.current = false;
      setUnsaved(dirty.current.size);
    }
    // Answers changed while this save was in flight: send them too.
    if (dirty.current.size && !finished.current) {
      window.clearTimeout(saveTimer.current);
      saveTimer.current = window.setTimeout(() => void flush(), AUTOSAVE_DELAY);
    }
  }, [id, finish]);

  const update = (a: AnswerInput) => {
    setAnswers((prev) => ({ ...prev, [a.questionId]: a }));
    dirty.current.add(a.questionId);
    setUnsaved(dirty.current.size);
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void flush(), AUTOSAVE_DELAY);
  };

  // Save when the tab is hidden, and warn before closing with unsaved answers.
  useEffect(() => {
    if (phase.kind !== "taking") return;
    const onHide = () => document.visibilityState === "hidden" && void flush();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirty.current.size) {
        void flush();
        e.preventDefault();
      }
    };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [phase.kind, flush]);

  // ── submit ──
  const submit = useCallback(
    async (auto: boolean) => {
      if (!id || finished.current) return;
      setSubmitting(true);
      window.clearTimeout(saveTimer.current);
      try {
        const all = Object.values(answersRef.current);
        const result = await submitExam(id, all);
        finish(result, auto || result.status === "TimedOut");
      } catch (err) {
        if (err instanceof OnlineExamApiError && err.status === 409) finish(null, true);
        else toast.error(err instanceof Error ? `${err.message} - your answers are saved, try again.` : "Couldn't submit - try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [id, finish],
  );

  // ── timer (server time, so changing the device clock doesn't help) ──
  const remaining = session ? Date.parse(session.deadlineUtc) - (now + offset.current) : 0;
  useEffect(() => {
    if (phase.kind !== "taking") return;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [phase.kind]);
  useEffect(() => {
    if (phase.kind !== "taking" || !session) return;
    for (const mins of [5, 1]) {
      if (remaining <= mins * 60000 && remaining > 0 && !warned.current.has(mins)) {
        warned.current.add(mins);
        toast(`${mins} minute${mins === 1 ? "" : "s"} left`, { icon: "⏰" });
      }
    }
    if (remaining <= 0 && !finished.current && !submitting && Date.now() - lastAutoSubmit.current > 5000) {
      lastAutoSubmit.current = Date.now();
      // The server closes the attempt at the deadline either way; submitting now keeps the last answers.
      void submit(true);
    }
  }, [remaining, phase.kind, session, submit, submitting]);

  const questions = useMemo(() => session?.questions ?? [], [session]);
  const counts = useMemo(() => {
    let answered = 0;
    let marked = 0;
    for (const q of questions) {
      if (hasResponse(answers[q.id])) answered++;
      if (answers[q.id]?.markedForReview) marked++;
    }
    return { answered, marked, unanswered: questions.length - answered };
  }, [questions, answers]);

  if (role && !isExamStudent(role)) {
    return (
      <Shell>
        <Message icon={AlertTriangle} title="Only students can take exams" body="Preview an exam from its page in Online Exams." action={<Button onClick={() => navigate("/online-exams")}>Go to Online Exams</Button>} />
      </Shell>
    );
  }

  if (phase.kind === "loading") {
    return (
      <Shell>
        <div className="flex flex-1 items-center justify-center gap-2 text-muted-foreground" role="status">
          <Loader2 className="h-5 w-5 animate-spin" />
          {wantsStart ? "Starting your exam…" : "Loading your exam…"}
        </div>
      </Shell>
    );
  }

  if (phase.kind === "error") {
    return (
      <Shell>
        <Message icon={AlertTriangle} title={phase.title} body={phase.message} action={<Button onClick={() => navigate("/online-exams/my")}>Back to my exams</Button>} />
      </Shell>
    );
  }

  if (phase.kind === "submitted") {
    const r = phase.result;
    return (
      <Shell>
        <Message
          icon={phase.timedOut ? TimerOff : CheckCircle2}
          tone={phase.timedOut ? "warning" : "success"}
          title={phase.timedOut ? "Time's up - your exam was submitted" : "Exam submitted"}
          body={
            r
              ? `You answered ${r.answered} of ${r.totalQuestions} question${r.totalQuestions === 1 ? "" : "s"} in ${r.examName}. ${r.resultAvailable ? "Your result is ready." : "You'll be notified when results are published."}`
              : "Your saved answers were submitted automatically. You'll be notified when results are published."
          }
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant={r?.resultAvailable ? "outline" : "default"} onClick={() => navigate("/online-exams/my")}>
                Back to my exams
              </Button>
              {r?.resultAvailable && (
                <Button onClick={() => navigate(`/online-exams/my/${r.examId}/result`)}>
                  <Award className="h-4 w-4" />
                  View result
                </Button>
              )}
            </div>
          }
        />
      </Shell>
    );
  }

  const s = session!;
  const q = questions[index];
  const answer = answers[q.id] ?? blank(q.id);
  const low = remaining <= 5 * 60000;
  const critical = remaining <= 60000;
  const canVisit = (i: number) => s.allowBackNavigation || i >= index;
  const go = (i: number) => {
    if (i < 0 || i >= questions.length || !canVisit(i)) return;
    void flush();
    setIndex(i);
    setFurthest((f) => Math.max(f, i));
    window.scrollTo({ top: 0 });
  };
  const label = (i: number) => (s.showQuestionNumbers ? `Question ${questions[i].number}` : `Question ${i + 1}`);

  return (
    <Shell>
      {/* Top bar: exam, save status, timer, submit */}
      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{s.examName}</p>
            <p className="truncate text-xs text-muted-foreground">
              {[s.subjectName, s.studentName, s.attemptNumber > 1 && `Attempt ${s.attemptNumber}`].filter(Boolean).join(" · ")}
            </p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex" aria-live="polite">
            {saveState === "retrying" ? (
              <>
                <CloudOff className="h-3.5 w-3.5 text-warning-strong" />
                <span className="text-warning-strong">Offline - retrying</span>
              </>
            ) : saveState === "saving" || unsaved > 0 ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Saving…
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                All answers saved
              </>
            )}
          </span>
          <div
            role="timer"
            aria-label={`Time left ${formatClock(remaining)}`}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 font-mono text-base font-semibold tabular-nums",
              critical ? "animate-pulse bg-destructive text-destructive-foreground" : low ? "bg-warning-soft text-warning-strong" : "bg-secondary text-foreground",
            )}
          >
            <Clock className="h-4 w-4" />
            {formatClock(remaining)}
          </div>
          <Button onClick={() => { void flush(); setConfirmOpen(true); }} disabled={submitting}>
            <Send className="h-4 w-4" />
            <span className="hidden sm:inline">Submit</span>
          </Button>
        </div>
        {saveState === "retrying" && (
          <p className="bg-warning-soft px-4 py-1.5 text-center text-xs text-warning-strong sm:hidden">Connection lost - your answers are kept and will save when you're back online.</p>
        )}
      </header>

      <div className="mx-auto grid w-full max-w-6xl flex-1 content-start gap-4 px-4 py-4 lg:grid-cols-[1fr_17rem]">
        {/* Question */}
        <main className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-border/80 bg-card p-5 shadow-sm sm:p-6" aria-labelledby="question-heading">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h1 id="question-heading" className="text-sm font-semibold text-muted-foreground">
                {label(index)} <span className="font-normal">of {questions.length}</span>
              </h1>
              <span className="text-xs text-muted-foreground">
                {QUESTION_TYPE_LABEL[q.type]} · {formatMarks(q.marks)} mark{q.marks === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mb-5 whitespace-pre-wrap text-base leading-relaxed text-foreground sm:text-lg">{q.text}</p>
            <QuestionBody q={q} answer={answer} onChange={update} />
          </section>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={() => go(index - 1)} disabled={index === 0 || !s.allowBackNavigation}>
              <ArrowLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button variant={answer.markedForReview ? "secondary" : "ghost"} onClick={() => update({ ...answer, markedForReview: !answer.markedForReview })} aria-pressed={answer.markedForReview}>
              {answer.markedForReview ? <BookmarkCheck className="h-4 w-4 text-warning-strong" /> : <Bookmark className="h-4 w-4" />}
              {answer.markedForReview ? "Marked for review" : "Mark for review"}
            </Button>
            <Button variant="ghost" onClick={() => update({ ...answer, selectedOptionIds: [], textAnswer: null })} disabled={!hasResponse(answer)}>
              <Eraser className="h-4 w-4" />
              Clear response
            </Button>
            <span className="flex-1" />
            {index < questions.length - 1 ? (
              <Button onClick={() => go(index + 1)}>
                {hasResponse(answer) ? "Save & next" : "Next"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => { void flush(); setConfirmOpen(true); }}>
                <Send className="h-4 w-4" />
                Finish & submit
              </Button>
            )}
          </div>
          {!s.allowBackNavigation && <p className="text-xs text-muted-foreground">This exam doesn't allow going back to earlier questions.</p>}
        </main>

        {/* Navigator */}
        <aside className="order-first lg:order-none" aria-label="Question navigator">
          <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-sm lg:sticky lg:top-20">
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-semibold text-foreground">Questions</span>
              <span className="tabular-nums text-muted-foreground">
                {counts.answered}/{questions.length} answered
              </span>
            </div>
            <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-secondary">
              <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${questions.length ? (counts.answered / questions.length) * 100 : 0}%` }} />
            </div>
            <ol className="grid grid-cols-8 gap-1.5 sm:grid-cols-10 lg:grid-cols-5">
              {questions.map((qq, i) => {
                const a = answers[qq.id];
                const done = hasResponse(a);
                const marked = !!a?.markedForReview;
                const current = i === index;
                return (
                  <li key={qq.id}>
                    <button
                      type="button"
                      onClick={() => go(i)}
                      disabled={!canVisit(i)}
                      aria-current={current ? "step" : undefined}
                      aria-label={`${label(i)}: ${done ? "answered" : i <= furthest ? "not answered" : "not visited"}${marked ? ", marked for review" : ""}`}
                      className={cn(
                        "relative flex h-9 w-full items-center justify-center rounded-lg border text-xs font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        done ? "border-success/40 bg-success-soft text-success-strong" : i <= furthest ? "border-destructive/30 bg-destructive-soft/60 text-destructive-strong" : "border-border bg-background text-muted-foreground",
                        current && "ring-2 ring-primary ring-offset-1 ring-offset-card",
                      )}
                    >
                      {s.showQuestionNumbers ? qq.number : i + 1}
                      {marked && <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-card bg-warning" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ol>
            <ul className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] text-muted-foreground">
              <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-success-soft ring-1 ring-success/40" />Answered</li>
              <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-destructive-soft ring-1 ring-destructive/30" />Not answered</li>
              <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-background ring-1 ring-border" />Not visited</li>
              <li className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-warning" />For review</li>
            </ul>
          </div>
        </aside>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !submitting && setConfirmOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Submit your exam?</DialogTitle>
            <DialogDescription>You can't change your answers after submitting.</DialogDescription>
          </DialogHeader>
          <dl className="grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-lg bg-success-soft px-2 py-2 text-success-strong">
              <dt className="text-xs">Answered</dt>
              <dd className="text-xl font-semibold tabular-nums">{counts.answered}</dd>
            </div>
            <div className={cn("rounded-lg px-2 py-2", counts.unanswered ? "bg-destructive-soft text-destructive-strong" : "bg-secondary text-secondary-foreground")}>
              <dt className="text-xs">Not answered</dt>
              <dd className="text-xl font-semibold tabular-nums">{counts.unanswered}</dd>
            </div>
            <div className={cn("rounded-lg px-2 py-2", counts.marked ? "bg-warning-soft text-warning-strong" : "bg-secondary text-secondary-foreground")}>
              <dt className="text-xs">For review</dt>
              <dd className="text-xl font-semibold tabular-nums">{counts.marked}</dd>
            </div>
          </dl>
          {s.allowReviewBeforeSubmit && (counts.unanswered > 0 || counts.marked > 0) && (
            <div className="space-y-1.5 text-sm">
              <p className="text-muted-foreground">Go back to:</p>
              <div className="flex flex-wrap gap-1.5">
                {questions.map((qq, i) =>
                  (!hasResponse(answers[qq.id]) || answers[qq.id]?.markedForReview) && canVisit(i) ? (
                    <Button key={qq.id} variant="outline" size="sm" onClick={() => { setConfirmOpen(false); go(i); }}>
                      {s.showQuestionNumbers ? qq.number : i + 1}
                      {answers[qq.id]?.markedForReview && <Bookmark className="h-3 w-3 text-warning-strong" />}
                    </Button>
                  ) : null,
                )}
              </div>
            </div>
          )}
          {saveState === "retrying" && <p className="text-sm text-warning-strong">You seem to be offline. Your answers are sent with the submission once you're connected.</p>}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={submitting}>
              Keep working
            </Button>
            <Button onClick={() => void submit(false)} loading={submitting}>
              <Send className="h-4 w-4" />
              Submit exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return <div className="flex min-h-dvh flex-col bg-background text-foreground">{children}</div>;
}

function Message({ icon: Icon, title, body, action, tone = "neutral" }: { icon: typeof Clock; title: string; body: string; action: ReactNode; tone?: "neutral" | "success" | "warning" }) {
  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-border/80 bg-card p-8 text-center shadow-sm">
        <span
          className={cn(
            "mx-auto flex h-14 w-14 items-center justify-center rounded-2xl",
            tone === "success" ? "bg-success-soft text-success-strong" : tone === "warning" ? "bg-warning-soft text-warning-strong" : "bg-secondary text-muted-foreground",
          )}
        >
          <Icon className="h-7 w-7" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-foreground">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{body}</p>
        <div className="mt-6">{action}</div>
        <p className="mt-4 text-xs text-muted-foreground">
          <Link to="/dashboard" className="hover:text-foreground">
            Go to dashboard
          </Link>
        </p>
      </div>
    </div>
  );
}
