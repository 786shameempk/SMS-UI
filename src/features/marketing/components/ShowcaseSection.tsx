import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Bus,
  Check,
  ChevronDown,
  Circle,
  CircleDot,
  Hand,
  Mic,
  MonitorUp,
  PhoneOff,
  ShieldCheck,
  UserCheck,
  Video,
} from "lucide-react";
import { cn } from "@/utils/cn";
import { ROLE_CARDS, type RoleId } from "../data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";
import { useLeadCapture } from "./LeadCapture";

// ── Visual: school at a glance ─────────────────────────────────────

const GRADES = [
  { name: "Grade 6", pct: 96 },
  { name: "Grade 7", pct: 94 },
  { name: "Grade 8", pct: 88 },
  { name: "Grade 9", pct: 93 },
  { name: "Grade 10", pct: 91 },
];

function GlanceVisual() {
  return (
    <div className="relative">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_30px_70px_-30px_rgb(15_23_42/0.3)] sm:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500">Today</p>
            <p className="text-base font-semibold tracking-tight text-slate-900">Attendance by grade</p>
          </div>
          <span className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600">
            All campuses <ChevronDown className="h-3 w-3" />
          </span>
        </div>

        <ul className="mt-5 space-y-3">
          {GRADES.map((g, i) => (
            <li key={g.name} className="flex items-center gap-3">
              <span className="w-16 shrink-0 text-xs font-medium text-slate-600">{g.name}</span>
              <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  initial={{ width: 0 }}
                  whileInView={{ width: `${g.pct}%` }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.9, delay: 0.1 + i * 0.08, ease: "easeOut" }}
                  className={cn("h-full rounded-full", g.pct < 90 ? "bg-amber-400" : "bg-brand-gradient")}
                />
              </div>
              <span className={cn("w-9 text-right text-xs font-semibold tabular-nums", g.pct < 90 ? "text-amber-600" : "text-slate-900")}>{g.pct}%</span>
            </li>
          ))}
        </ul>

        <div className="mt-6 grid grid-cols-3 gap-2.5 border-t border-slate-100 pt-5">
          {[
            { label: "Absent today", value: "182" },
            { label: "Fee dues", value: "₹6.2L" },
            { label: "Open requests", value: "6" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-slate-50 px-3 py-2.5">
              <p className="text-lg font-bold tabular-nums tracking-tight text-slate-900">{s.value}</p>
              <p className="text-[11px] text-slate-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, x: 16 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="absolute -bottom-6 right-4 flex max-w-[16rem] items-start gap-2.5 rounded-xl border border-amber-200 bg-white p-3 shadow-xl shadow-slate-900/10 sm:-right-6"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-50">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
        </span>
        <p className="text-xs leading-snug text-slate-600">
          <span className="font-semibold text-slate-900">Grade 8 is below 90%</span> for the third day this week.
        </p>
      </motion.div>
    </div>
  );
}

// ── Visual: online class ────────────────────────────────────────────

const TILES = [
  { name: "Ms. Iyer", initials: "MI", speaking: true, tone: "from-brand-400 to-brand-700" },
  { name: "Arjun", initials: "AN", tone: "from-slate-500 to-slate-700" },
  { name: "Diya", initials: "DS", tone: "from-teal-500 to-teal-700" },
  { name: "Kabir", initials: "KR", tone: "from-indigo-400 to-indigo-600" },
];

function ClassVisual() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-[0_30px_70px_-30px_rgb(15_23_42/0.6)]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">Physics · Refraction of light</p>
          <p className="text-[11px] text-slate-400">Grade 10 · A &middot; 36 joined</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 rounded-full bg-red-500/15 px-2 py-0.5 text-[10px] font-bold text-red-400">
            <CircleDot className="h-3 w-3" /> REC
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] font-bold text-white">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
          </span>
        </div>
      </div>

      <div className="flex">
        <div className="grid flex-1 grid-cols-2 gap-2 p-3">
          {TILES.map((t) => (
            <div
              key={t.name}
              className={cn(
                "relative flex aspect-video items-center justify-center overflow-hidden rounded-xl bg-slate-900",
                t.speaking && "ring-2 ring-brand-400",
              )}
            >
              <span className={cn("flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br text-sm font-bold text-white", t.tone)}>{t.initials}</span>
              <span className="absolute bottom-1.5 left-1.5 rounded-md bg-black/50 px-1.5 py-0.5 text-[10px] font-medium text-white">{t.name}</span>
              {t.speaking && (
                <span className="absolute right-1.5 top-1.5 flex h-5 items-end gap-0.5 rounded-md bg-black/40 px-1 pb-1">
                  {[3, 6, 4].map((h, i) => (
                    <motion.span
                      key={i}
                      className="w-0.5 rounded-full bg-brand-300"
                      animate={{ height: [h, h + 5, h] }}
                      transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </span>
              )}
            </div>
          ))}
        </div>

        <div className="hidden w-44 shrink-0 flex-col border-l border-white/10 p-3 sm:flex">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Class chat</p>
          <div className="mt-3 space-y-2.5">
            <div>
              <p className="text-[10px] font-semibold text-brand-300">Ms. Iyer</p>
              <p className="text-[11px] leading-snug text-slate-300">Notes are in Materials 📎</p>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400">Diya</p>
              <p className="text-[11px] leading-snug text-slate-300">Is this in the unit test?</p>
            </div>
          </div>
          <div className="mt-auto flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2 py-1.5 text-[10px] font-medium text-emerald-400">
            <UserCheck className="h-3 w-3" /> Attendance auto-recorded
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 border-t border-white/10 py-3">
        {[Mic, Video, MonitorUp, Hand].map((Icon, i) => (
          <span key={i} className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-slate-200">
            <Icon className="h-3.5 w-3.5" />
          </span>
        ))}
        <span className="flex h-8 w-11 items-center justify-center rounded-full bg-red-500 text-white">
          <PhoneOff className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

// ── Role previews ───────────────────────────────────────────────────

function AdminPreview() {
  return (
    <div className="space-y-2">
      <div className="flex h-14 items-end gap-1.5">
        {[45, 60, 52, 70, 64, 82, 90].map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm bg-brand-gradient" style={{ height: `${h}%`, opacity: 0.45 + i * 0.08 }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        <MiniStat label="Enrolled" value="2,384" />
        <MiniStat label="Collected" value="₹48.1L" />
      </div>
    </div>
  );
}

function TeacherPreview() {
  return (
    <ul className="space-y-1.5">
      {[
        { t: "09:00", s: "Maths · 9 B", done: true },
        { t: "10:30", s: "Physics · 10 A", live: true },
        { t: "12:00", s: "Maths · 8 C" },
      ].map((row) => (
        <li key={row.t} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200/70">
          <span className="text-[10px] font-semibold tabular-nums text-slate-400">{row.t}</span>
          <span className="flex-1 truncate text-[11px] font-medium text-slate-700">{row.s}</span>
          {row.done ? (
            <Check className="h-3 w-3 text-emerald-600" />
          ) : row.live ? (
            <span className="rounded bg-brand-100 px-1.5 text-[9px] font-bold text-brand-800">Mark</span>
          ) : (
            <Circle className="h-3 w-3 text-slate-300" />
          )}
        </li>
      ))}
    </ul>
  );
}

function StudentPreview() {
  return (
    <ul className="space-y-1.5">
      {[
        { s: "Algebra worksheet 4", due: "Today", done: true },
        { s: "Lab report: Refraction", due: "Thu" },
        { s: "Read: Chapter 7", due: "Fri" },
      ].map((row) => (
        <li key={row.s} className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200/70">
          <span className={cn("flex h-3.5 w-3.5 items-center justify-center rounded border", row.done ? "border-brand-500 bg-brand-500" : "border-slate-300")}>
            {row.done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} />}
          </span>
          <span className={cn("flex-1 truncate text-[11px] font-medium", row.done ? "text-slate-400 line-through" : "text-slate-700")}>{row.s}</span>
          <span className="text-[10px] text-slate-400">{row.due}</span>
        </li>
      ))}
    </ul>
  );
}

function ParentPreview() {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200/70">
        <span className="bg-brand-gradient flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white">AN</span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-slate-800">Arjun · Grade 6 B</p>
          <p className="text-[10px] text-emerald-600">96% attendance</p>
        </div>
      </div>
      <div className="flex items-center justify-between rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200/70">
        <span className="text-[11px] text-slate-600">Term 2 fee · ₹8,000</span>
        <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[9px] font-bold text-white">Pay</span>
      </div>
      <div className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-[11px] text-slate-600 ring-1 ring-slate-200/70">
        <Bus className="h-3 w-3 text-brand-700" /> Bus arriving in 12 min
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-white px-2 py-1.5 ring-1 ring-slate-200/70">
      <p className="text-[12px] font-bold tabular-nums text-slate-900">{value}</p>
      <p className="text-[10px] text-slate-500">{label}</p>
    </div>
  );
}

const PREVIEWS: Record<RoleId, () => ReactNode> = {
  admin: AdminPreview,
  teacher: TeacherPreview,
  student: StudentPreview,
  parent: ParentPreview,
};

// ── Section ─────────────────────────────────────────────────────────

function ShowcaseRow({
  eyebrow,
  title,
  description,
  points,
  visual,
  reverse,
  cta,
}: {
  eyebrow: string;
  title: string;
  description: string;
  points: string[];
  visual: ReactNode;
  reverse?: boolean;
  cta?: ReactNode;
}) {
  return (
    <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-20">
      <Reveal className={cn(reverse && "lg:order-2")}>{visual}</Reveal>
      <Reveal delay={0.1} className={cn(reverse && "lg:order-1")}>
        <SectionHeading align="left" eyebrow={eyebrow} title={title} description={description} />
        <ul className="mt-7 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-[15px] text-slate-700">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100">
                <Check className="h-3 w-3 text-brand-800" strokeWidth={3} />
              </span>
              {p}
            </li>
          ))}
        </ul>
        {cta}
      </Reveal>
    </div>
  );
}

export default function ShowcaseSection() {
  const { openDemo } = useLeadCapture();

  return (
    <section id="solutions" className="scroll-mt-16 bg-gradient-to-b from-slate-50 to-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl space-y-28 px-4 sm:px-6 lg:px-8 lg:space-y-36">
        <ShowcaseRow
          eyebrow="Dashboard"
          title="See Your School at a Glance"
          description="Get a real-time overview of attendance, students, academic activities, notifications, and important school metrics from a single dashboard."
          points={["One campus or every branch combined", "Widgets each role can arrange for themselves", "Problems flagged before they become emergencies"]}
          visual={<GlanceVisual />}
          cta={
            <button type="button" onClick={openDemo} className="group mt-8 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-800 hover:text-brand-900">
              See it with your school's data
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
          }
        />

        <ShowcaseRow
          reverse
          eyebrow="Online classes"
          title="The Classroom, Wherever Students Are"
          description="Schedule a live class and students get a reminder, join from their browser, and find the recording and materials afterwards. No separate video tool to buy or manage."
          points={["Attendance recorded automatically", "Recordings and class materials in one place", "Chat, hand-raise, and screen sharing built in"]}
          visual={<ClassVisual />}
        />

        {/* Designed for every role */}
        <div>
          <Reveal>
            <SectionHeading
              eyebrow="Built for everyone"
              title="Designed for Every Role"
              description="Each person sees a workspace shaped around their day — with exactly the access their role allows."
            />
          </Reveal>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {ROLE_CARDS.map((card, i) => {
              const Preview = PREVIEWS[card.id];
              return (
                <motion.article
                  key={card.id}
                  initial={{ opacity: 0, y: 16 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 0.45, delay: i * 0.08, ease: "easeOut" }}
                  className="group flex flex-col rounded-2xl border border-slate-200/80 bg-white p-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgb(15_23_42/0.25)]"
                >
                  <div className="rounded-xl border border-slate-100 bg-gradient-to-b from-slate-50 to-slate-100/60 p-3.5 transition-colors group-hover:from-brand-50/60">
                    <Preview />
                  </div>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="text-base font-semibold tracking-tight text-slate-900">{card.role}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{card.headline}</p>
                    <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                      {card.points.map((p) => (
                        <li key={p} className="flex items-start gap-2 text-[13px] text-slate-600">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-600" strokeWidth={2.5} />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                </motion.article>
              );
            })}
          </div>

          <Reveal delay={0.1} className="mt-8 flex justify-center">
            <p className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-700" />
              Need a role that isn't listed? Create your own and choose exactly what it can see.
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
