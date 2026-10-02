import { useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Check, ClipboardList, Loader2, Send, Sparkles } from "lucide-react";
import { cn } from "@/utils/cn";
import { AI_PRINCIPLES, AI_SHOWCASE, type AiShowcaseId } from "../data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

// ── Small building blocks for the product mockups ───────────────────

function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "brand" | "success" | "warning" | "danger" }) {
  const tones = {
    neutral: "border-slate-200 bg-slate-50 text-slate-600",
    brand: "border-brand-200 bg-brand-50 text-brand-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
    danger: "border-rose-200 bg-rose-50 text-rose-700",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", tones[tone])}>{children}</span>;
}

function AiDraftBadge() {
  return (
    <Chip tone="brand">
      <Sparkles className="h-3 w-3" /> AI draft · review before use
    </Chip>
  );
}

function Window({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_30px_70px_-30px_rgb(15_23_42/0.35)]">
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
          <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        </span>
        <span className="ml-1 text-xs font-medium text-slate-500">{title}</span>
      </div>
      <div className="space-y-3 p-4 sm:p-5">{children}</div>
    </div>
  );
}

function Bubble({ from, children }: { from: "user" | "ai"; children: ReactNode }) {
  return (
    <div className={cn("flex", from === "user" ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
          from === "user" ? "bg-brand-gradient rounded-br-md text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700",
        )}
      >
        {children}
      </div>
    </div>
  );
}

// ── One mockup per AI feature ───────────────────────────────────────

function AssistantVisual() {
  return (
    <Window title="Ask School AI">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        Asking about <Chip tone="brand">Aarav · Grade 6 A</Chip>
      </div>
      <Bubble from="user">Are any fees pending for Aarav?</Bubble>
      <Bubble from="ai">
        Tuition of ₹4,200 for Term 2 is due on 10 October. The September bus fee is already paid.
        <span className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-slate-400">Based on:</span>
          <Chip>Fees</Chip>
        </span>
      </Bubble>
      <Bubble from="user">Was he in school all week?</Bubble>
      <Bubble from="ai">
        Present 4 of 5 days this week. He was absent on Tuesday.
        <span className="mt-2 flex flex-wrap items-center gap-1">
          <span className="text-[11px] text-slate-400">Based on:</span>
          <Chip>Attendance</Chip>
        </span>
      </Bubble>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-400">
        <span className="flex-1">Ask about timetable, homework, exams…</span>
        <Send className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
      </div>
    </Window>
  );
}

function PapersVisual() {
  const mix = [
    { label: "Easy", pct: 30, cls: "bg-emerald-400" },
    { label: "Medium", pct: 50, cls: "bg-amber-400" },
    { label: "Hard", pct: 20, cls: "bg-rose-400" },
  ];
  return (
    <Window title="Exam paper generator">
      <div className="flex flex-wrap items-center gap-1.5">
        <Chip>Grade 8 · Science</Chip>
        <Chip>Force and Pressure</Chip>
        <Chip>40 marks · 60 min</Chip>
      </div>
      <div>
        <div className="flex h-2 overflow-hidden rounded-full" role="img" aria-label="30% easy, 50% medium, 20% hard">
          {mix.map((m) => (
            <span key={m.label} className={m.cls} style={{ width: `${m.pct}%` }} />
          ))}
        </div>
        <div className="mt-1.5 flex gap-3 text-[11px] text-slate-500">
          {mix.map((m) => (
            <span key={m.label}>
              {m.label} {m.pct}%
            </span>
          ))}
        </div>
      </div>
      <AiDraftBadge />
      {[
        { n: 1, type: "MCQ", text: "Which of these is the SI unit of pressure?", meta: "1 mark · Easy" },
        { n: 2, type: "Short answer", text: "Why does a sharp knife cut better than a blunt one?", meta: "2 marks · Medium" },
        { n: 3, type: "Long answer", text: "Explain, with an example, how friction can be both useful and harmful.", meta: "5 marks · Hard" },
      ].map((q) => (
        <div key={q.n} className="rounded-xl border border-slate-200 px-3 py-2.5">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span className="font-semibold text-slate-700">Q{q.n}</span>
            <Chip>{q.type}</Chip>
            <span className="ml-auto">{q.meta}</span>
          </div>
          <p className="mt-1 text-[13px] text-slate-800">{q.text}</p>
        </div>
      ))}
      <div className="flex flex-wrap gap-2 pt-1">
        <span className="bg-brand-gradient inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold text-white">
          <Check className="h-3.5 w-3.5" /> Add to question bank
        </span>
        <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">
          <ClipboardList className="h-3.5 w-3.5" /> Assign as homework
        </span>
      </div>
    </Window>
  );
}

function StudyVisual() {
  return (
    <Window title="Study assistant">
      <div className="flex flex-wrap gap-1.5">
        {["Ask", "Explain", "Summarize", "Flashcards", "Quiz me"].map((m, i) => (
          <span
            key={m}
            className={cn(
              "rounded-lg px-2.5 py-1 text-[11px] font-semibold",
              i === 1 ? "bg-brand-gradient text-white" : "border border-slate-200 text-slate-600",
            )}
          >
            {m}
          </span>
        ))}
      </div>
      <Bubble from="user">Explain friction in simple words</Bubble>
      <Bubble from="ai">
        Friction is the force that slows things down when two surfaces rub together [1]. Rough surfaces like a carpet
        create more friction than smooth ones like ice, which is why it&apos;s easier to slide on ice [2].
        <span className="mt-2 block border-t border-slate-100 pt-2 text-[11px] text-slate-500">
          <span className="mb-1 flex items-center gap-1 font-medium">
            <BookOpen className="h-3 w-3" /> From your school materials
          </span>
          [1] Chapter 4 — Force and Pressure, page 3
          <br />
          [2] Chapter 4 — Force and Pressure, page 5
        </span>
      </Bubble>
    </Window>
  );
}

function RemarksVisual() {
  const rows = [
    { name: "Aarav S.", score: "88% · A", text: "Aarav has made excellent progress in Maths this term and explains his reasoning clearly. Regular reading practice will help him in English." },
    { name: "Diya K.", score: "74% · B", text: "Diya works steadily and her Science marks rose by 12 points. Revising key terms before tests will lift her results further." },
    { name: "Kabir M.", score: "61% · C", text: "Kabir participates well in class discussions. Short daily practice in fractions would build his confidence in Maths." },
  ];
  return (
    <Window title="Draft report card remarks · Midterm">
      <div>
        <div className="flex items-center justify-between text-xs">
          <span className="flex items-center gap-1.5 font-medium text-slate-700">
            <Loader2 className="h-3.5 w-3.5 animate-spin text-brand-600" aria-hidden="true" /> Drafting 24 of 32
          </span>
          <span className="text-slate-400">Encouraging · Medium</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
          <motion.div className="bg-brand-gradient h-full" initial={{ width: "20%" }} animate={{ width: "75%" }} transition={{ duration: 1.6, ease: "easeOut" }} />
        </div>
      </div>
      {rows.map((r) => (
        <div key={r.name} className="rounded-xl border border-slate-200 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span className="bg-brand-gradient flex h-4 w-4 items-center justify-center rounded text-white" aria-hidden="true">
              <Check className="h-3 w-3" />
            </span>
            <span className="text-[13px] font-semibold text-slate-800">{r.name}</span>
            <span className="text-[11px] text-slate-500">{r.score}</span>
            <span className="ml-auto">
              <Chip tone="brand">
                <Sparkles className="h-3 w-3" /> AI draft
              </Chip>
            </span>
          </div>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-slate-600">{r.text}</p>
        </div>
      ))}
    </Window>
  );
}

function InsightsVisual() {
  const topics = [
    { topic: "Simplifying fractions", pct: 35, tone: "danger" as const, bar: "bg-rose-400" },
    { topic: "Word problems", pct: 55, tone: "warning" as const, bar: "bg-amber-400" },
    { topic: "Adding fractions", pct: 90, tone: "success" as const, bar: "bg-emerald-400" },
  ];
  return (
    <Window title="Exam insights · Fractions test">
      <p className="text-[13px] leading-relaxed text-slate-700">
        The class handled adding fractions well but struggled to simplify them, and many students skipped Q3.
      </p>
      <ul className="space-y-2.5" aria-label="Average correct by topic">
        {topics.map((t, i) => (
          <li key={t.topic}>
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700">{t.topic}</span>
              <Chip tone={t.tone}>{t.pct}% correct</Chip>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={cn("h-full rounded-full", t.bar)}
                initial={{ width: 0 }}
                animate={{ width: `${t.pct}%` }}
                transition={{ duration: 0.8, delay: 0.1 + i * 0.1, ease: "easeOut" }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className="rounded-xl border border-brand-200 bg-brand-50/60 px-3 py-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">What to revise</p>
        <p className="mt-1 text-[13px] text-slate-700">Reteach finding common factors, then a 5-minute simplifying warm-up for the next week.</p>
      </div>
    </Window>
  );
}

const VISUALS: Record<AiShowcaseId, () => ReactNode> = {
  assistant: AssistantVisual,
  papers: PapersVisual,
  study: StudyVisual,
  remarks: RemarksVisual,
  insights: InsightsVisual,
};

// ── Section ─────────────────────────────────────────────────────────

/** The AI features, one at a time: a tab per feature on the left and a product-style preview on the right. */
export default function AiSection() {
  const [active, setActive] = useState<AiShowcaseId>("assistant");
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const item = AI_SHOWCASE.find((a) => a.id === active)!;
  const Visual = VISUALS[active];

  // Arrow keys move between tabs (the standard tablist pattern).
  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    e.preventDefault();
    const next = (index + delta + AI_SHOWCASE.length) % AI_SHOWCASE.length;
    setActive(AI_SHOWCASE[next].id);
    tabs.current[next]?.focus();
  };

  return (
    <section id="ai" className="relative isolate scroll-mt-16 overflow-hidden bg-gradient-to-b from-white via-brand-50/40 to-white py-24 sm:py-32">
      <div className="pointer-events-none absolute left-1/2 top-24 -z-10 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-brand-200),transparent)] opacity-40" />

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="School AI"
            title={
              <>
                AI that works for <span className="text-brand-gradient">every role</span> in your school
              </>
            }
            description="From a parent asking about fees to a teacher drafting the next exam paper: AI built into the school system, answering from your own records and leaving every decision with your staff."
          />
        </Reveal>

        <Reveal delay={0.1} className="mt-14">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-10">
            <div role="tablist" aria-label="AI features" aria-orientation="vertical" className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
              {AI_SHOWCASE.map((a, i) => {
                const selected = a.id === active;
                return (
                  <button
                    key={a.id}
                    ref={(el) => {
                      tabs.current[i] = el;
                    }}
                    type="button"
                    role="tab"
                    id={`ai-tab-${a.id}`}
                    aria-selected={selected}
                    aria-controls="ai-panel"
                    tabIndex={selected ? 0 : -1}
                    onClick={() => setActive(a.id)}
                    onKeyDown={(e) => onKeyDown(e, i)}
                    className={cn(
                      "group flex shrink-0 items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all lg:shrink",
                      selected
                        ? "border-brand-300 bg-white shadow-[0_12px_30px_-14px_rgb(15_23_42/0.25)]"
                        : "border-transparent hover:border-slate-200 hover:bg-white/70",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                        selected ? "bg-brand-gradient text-white shadow-sm" : "bg-slate-100 text-slate-500 group-hover:text-brand-700",
                      )}
                    >
                      <a.icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className={cn("block text-sm font-semibold", selected ? "text-slate-900" : "text-slate-700")}>{a.label}</span>
                      <span className="hidden text-xs text-slate-500 lg:block">{a.audience}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div id="ai-panel" role="tabpanel" aria-labelledby={`ai-tab-${active}`} className="min-w-0">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                  className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]"
                >
                  <div className="xl:pt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{item.audience}</p>
                    <h3 className="mt-2 text-2xl font-bold tracking-tight text-balance text-slate-900">{item.title}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-pretty text-slate-600">{item.description}</p>
                  </div>
                  <Visual />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </Reveal>

        <Reveal delay={0.15} className="mt-14">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="How School AI stays safe">
            {AI_PRINCIPLES.map((p) => (
              <li key={p.label} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-3 text-sm font-medium text-slate-700 backdrop-blur">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <p.icon className="h-4 w-4" />
                </span>
                {p.label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
