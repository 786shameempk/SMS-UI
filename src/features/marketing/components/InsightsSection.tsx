import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CircleCheck, Download, FileBarChart, TrendingDown, UserRoundSearch } from "lucide-react";
import { INSIGHT_CAPABILITIES } from "../data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

// Connected data points behind the insight cards (viewBox 400×420).
const NODES = [
  [40, 60], [150, 30], [290, 70], [370, 20], [90, 170], [230, 150], [350, 190],
  [30, 290], [170, 260], [300, 300], [380, 350], [110, 390], [250, 400],
] as const;
const EDGES: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [0, 4], [1, 5], [2, 5], [2, 6], [4, 5], [5, 6], [4, 7], [4, 8],
  [5, 8], [6, 9], [8, 9], [9, 10], [7, 11], [8, 11], [8, 12], [9, 12], [6, 10],
];

function Network() {
  return (
    <svg viewBox="0 0 400 420" className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {EDGES.map(([a, b], i) => (
        <motion.line
          key={i}
          x1={NODES[a][0]}
          y1={NODES[a][1]}
          x2={NODES[b][0]}
          y2={NODES[b][1]}
          stroke="var(--color-brand-400)"
          strokeOpacity="0.18"
          strokeWidth="1"
          initial={{ pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, delay: i * 0.04 }}
        />
      ))}
      {NODES.map(([x, y], i) => (
        <motion.circle
          key={i}
          cx={x}
          cy={y}
          r="3"
          fill="var(--color-brand-300)"
          animate={{ opacity: [0.25, 0.9, 0.25] }}
          transition={{ duration: 3, repeat: Infinity, delay: (i % 5) * 0.6 }}
        />
      ))}
    </svg>
  );
}

function InsightCard({ index, className, children }: { index: number; className?: string; children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.97 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.5, delay: 0.3 + index * 0.25, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-2xl border border-white/10 bg-white/[0.06] p-4 shadow-2xl shadow-black/30 backdrop-blur-md ${className ?? ""}`}
    >
      {children}
    </motion.div>
  );
}

export default function InsightsSection() {
  return (
    <section id="insights" className="relative isolate scroll-mt-16 overflow-hidden bg-slate-950 py-24 sm:py-32">
      {/* Backdrop glows */}
      <div className="pointer-events-none absolute -left-40 top-0 -z-10 h-[30rem] w-[30rem] rounded-full bg-brand-500/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 right-0 -z-10 h-[34rem] w-[34rem] rounded-full bg-brand-700/20 blur-3xl" />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.07]"
        style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }}
      />

      <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Reveal>
          <SectionHeading
            align="left"
            inverted
            eyebrow="Smarter insights"
            title="Make Better Decisions with Smarter Insights"
            description="School Sphere quietly watches the patterns across attendance, academics, and fees — and brings the things that matter to your attention, based on your school's real records."
          />
          <ul className="mt-10 grid gap-3 sm:grid-cols-2">
            {INSIGHT_CAPABILITIES.map((c) => (
              <li key={c.label} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3.5 py-3 text-sm text-slate-200 transition-colors hover:border-brand-400/30 hover:bg-white/[0.06]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-400/10 text-brand-300">
                  <c.icon className="h-4 w-4" />
                </span>
                {c.label}
              </li>
            ))}
          </ul>
        </Reveal>

        <div className="relative min-h-[26rem] sm:min-h-[28rem]">
          <Network />
          <div className="relative flex flex-col gap-3.5 py-4 sm:px-6">
            <InsightCard index={0} className="sm:mr-16">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
                  <TrendingDown className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-300/90">Attendance trend</p>
                  <p className="mt-1 text-sm font-medium leading-snug text-white">Monday attendance in Grade 8 has dipped 4% over three weeks.</p>
                </div>
                <svg viewBox="0 0 60 24" className="mt-1 hidden h-6 w-16 shrink-0 sm:block" aria-hidden="true">
                  <polyline points="0,4 12,6 24,5 36,11 48,15 60,20" fill="none" stroke="rgb(252 211 77)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </InsightCard>

            <InsightCard index={1} className="sm:ml-12">
              <div className="flex items-start gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-400/15 text-brand-300">
                  <UserRoundSearch className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-300">May need attention</p>
                  <p className="mt-1 text-sm font-medium leading-snug text-white">3 students with falling test scores and attendance under 75%.</p>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex -space-x-1.5">
                      {["RK", "SP", "AM"].map((i, n) => (
                        <span key={i} className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-700 text-[9px] font-bold text-white ring-2 ring-slate-900" style={{ zIndex: 3 - n }}>
                          {i}
                        </span>
                      ))}
                    </div>
                    <span className="rounded-md bg-white/10 px-2 py-1 text-[11px] font-semibold text-white">Review</span>
                  </div>
                </div>
              </div>
            </InsightCard>

            <InsightCard index={2} className="sm:mr-8">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-400/15 text-sky-300">
                  <FileBarChart className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">September fee report is ready</p>
                  <p className="text-xs text-slate-400">₹42.6L collected · 88% of expected</p>
                </div>
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10 text-slate-200">
                  <Download className="h-3.5 w-3.5" />
                </span>
              </div>
            </InsightCard>

            <InsightCard index={3} className="sm:ml-20">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-400/15 text-emerald-300">
                  <CircleCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white">Fee reminders sent automatically</p>
                  <p className="text-xs text-slate-400">124 parents · 3 days before the due date</p>
                </div>
              </div>
            </InsightCard>
          </div>
        </div>
      </div>
    </section>
  );
}
