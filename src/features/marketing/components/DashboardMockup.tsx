import type { ReactNode } from "react";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpenCheck,
  CalendarCheck,
  CalendarDays,
  ChartColumn,
  ChevronDown,
  GraduationCap,
  LayoutDashboard,
  Megaphone,
  Search,
  Settings,
  UserCheck,
  Users,
  Video,
  Wallet,
} from "lucide-react";
import { cn } from "@/utils/cn";

/**
 * A static, production-looking School Sphere dashboard for the hero. Panels appear one after another;
 * on phones the sidebar and secondary panels drop away so the preview never forces horizontal scroll.
 */

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard", active: true },
  { icon: GraduationCap, label: "Students" },
  { icon: CalendarCheck, label: "Attendance" },
  { icon: BookOpenCheck, label: "Academics" },
  { icon: Video, label: "Online Classes" },
  { icon: Wallet, label: "Fees" },
  { icon: Megaphone, label: "Communication" },
  { icon: ChartColumn, label: "Reports" },
];

const KPIS = [
  { icon: Users, label: "Total students", value: "2,384", note: "+18 this week" },
  { icon: CalendarCheck, label: "Attendance today", value: "92.4%", note: "+1.2% vs last week" },
  { icon: Wallet, label: "Fees collected", value: "₹48.1L", note: "76% of term target" },
  { icon: UserCheck, label: "Teachers present", value: "158/162", note: "4 on approved leave" },
];

// Weekly attendance %, oldest first.
const ATTENDANCE = [88, 90, 87, 91, 89, 93, 90, 92, 94, 91, 93, 92];

const CLASSES = [
  { time: "10:30", subject: "Physics", group: "Grade 10 · A", live: true },
  { time: "11:15", subject: "Mathematics", group: "Grade 9 · B" },
  { time: "12:00", subject: "English Literature", group: "Grade 8 · C" },
];

const ASSIGNMENTS = [
  { title: "Algebra worksheet 4", group: "Grade 9 · B", done: 32, total: 40 },
  { title: "Lab report: Refraction", group: "Grade 10 · A", done: 18, total: 38 },
  { title: "Essay: Monsoon", group: "Grade 8 · C", done: 36, total: 36 },
];

const NOTIFICATIONS = [
  { text: "Parent–teacher meeting scheduled for Friday", time: "9:02" },
  { text: "Fee reminder sent to 124 parents", time: "8:45" },
  { text: "Bus 4 running 10 minutes late", time: "8:10" },
];

const ACTIVITY = [
  { who: "MI", text: "Meera marked attendance for 9 B", time: "2m" },
  { who: "AP", text: "Invoice #1204 paid online", time: "8m" },
  { who: "RN", text: "New admission: Arjun Nair", time: "15m" },
];

function linePath(values: number[], w: number, h: number, min: number, max: number) {
  const step = w / (values.length - 1);
  return values.map((v, i) => `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(h - ((v - min) / (max - min)) * h).toFixed(1)}`).join(" ");
}

function Panel({ children, className, index }: { children: ReactNode; className?: string; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: 0.55 + index * 0.08, ease: "easeOut" }}
      className={cn("rounded-xl border border-slate-200/80 bg-white p-3 shadow-[0_1px_2px_rgb(15_23_42/0.04)]", className)}
    >
      {children}
    </motion.div>
  );
}

function PanelTitle({ children, action }: { children: ReactNode; action?: string }) {
  return (
    <div className="mb-2.5 flex items-center justify-between">
      <p className="text-[11px] font-semibold text-slate-800">{children}</p>
      {action && <span className="text-[10px] font-medium text-brand-700">{action}</span>}
    </div>
  );
}

export default function DashboardMockup() {
  const W = 320;
  const H = 88;
  const line = linePath(ATTENDANCE, W, H, 80, 100);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white text-left shadow-[0_30px_80px_-20px_rgb(15_23_42/0.25)] ring-1 ring-slate-900/5">
      {/* Window chrome */}
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <span className="h-2.5 w-2.5 rounded-full bg-slate-300" />
        <div className="mx-auto hidden w-64 items-center justify-center rounded-md border border-slate-200 bg-white px-3 py-1 text-[10px] text-slate-400 sm:flex">
          app.schoolsphere.com/dashboard
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden w-44 shrink-0 flex-col border-r border-slate-100 bg-slate-50/50 p-3 lg:flex">
          <div className="mb-4 flex items-center gap-2 px-1">
            <div className="bg-brand-gradient flex h-6 w-6 items-center justify-center rounded-md">
              <GraduationCap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="text-[12px] font-bold tracking-tight text-slate-900">School Sphere</span>
          </div>
          <nav className="space-y-0.5">
            {NAV.map((item) => (
              <div
                key={item.label}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium",
                  item.active ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200/70" : "text-slate-500",
                )}
              >
                <item.icon className={cn("h-3.5 w-3.5", item.active ? "text-brand-600" : "text-slate-400")} />
                {item.label}
              </div>
            ))}
          </nav>
          <div className="mt-auto flex items-center gap-2 rounded-md px-2 py-1.5 text-[11px] font-medium text-slate-500">
            <Settings className="h-3.5 w-3.5 text-slate-400" />
            Settings
          </div>
        </aside>

        {/* Main */}
        <div className="min-w-0 flex-1 bg-slate-50/40">
          {/* Top bar */}
          <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-2.5">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] text-slate-400 sm:max-w-xs">
              <Search className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Search students, classes, invoices…</span>
              <kbd className="ml-auto hidden rounded border border-slate-200 bg-white px-1 text-[9px] font-medium text-slate-400 sm:inline">⌘K</kbd>
            </div>
            <div className="ml-auto hidden items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[11px] font-medium text-slate-600 md:flex">
              Main Campus <ChevronDown className="h-3 w-3" />
            </div>
            <div className="relative">
              <Bell className="h-4 w-4 text-slate-500" />
              <span className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-brand-500 ring-2 ring-white" />
            </div>
            <div className="bg-brand-gradient flex h-6 w-6 items-center justify-center rounded-full text-[9px] font-bold text-white">AW</div>
          </div>

          <div className="space-y-3 p-3 sm:p-4">
            {/* Greeting */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.45 }}
              className="flex flex-wrap items-end justify-between gap-2"
            >
              <div>
                <p className="text-[13px] font-bold text-slate-900 sm:text-sm">Good morning, Ava</p>
                <p className="text-[10px] text-slate-500 sm:text-[11px]">Here's what's happening at Greenfield Public School today.</p>
              </div>
              <span className="flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600">
                <CalendarDays className="h-3 w-3" /> Tue, 14 Oct
              </span>
            </motion.div>

            {/* KPIs */}
            <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
              {KPIS.map((kpi, i) => (
                <Panel key={kpi.label} index={i}>
                  <div className="flex items-center gap-1.5">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-brand-50">
                      <kpi.icon className="h-3 w-3 text-brand-700" />
                    </div>
                    <p className="truncate text-[10px] font-medium text-slate-500">{kpi.label}</p>
                  </div>
                  <p className="mt-2 text-base font-bold tabular-nums tracking-tight text-slate-900">{kpi.value}</p>
                  <p className="truncate text-[9.5px] font-medium text-emerald-600">{kpi.note}</p>
                </Panel>
              ))}
            </div>

            {/* Chart + upcoming classes */}
            <div className="grid gap-2.5 md:grid-cols-5">
              <Panel index={4} className="md:col-span-3">
                <PanelTitle action="Last 12 weeks">Attendance trend</PanelTitle>
                <svg viewBox={`0 0 ${W} ${H + 4}`} className="h-24 w-full" preserveAspectRatio="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="mock-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-brand-400)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--color-brand-400)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0.25, 0.5, 0.75].map((f) => (
                    <line key={f} x1="0" x2={W} y1={H * f} y2={H * f} stroke="#e2e8f0" strokeDasharray="3 4" strokeWidth="1" vectorEffect="non-scaling-stroke" />
                  ))}
                  <path d={`${line} L${W},${H + 4} L0,${H + 4} Z`} fill="url(#mock-area)" />
                  <motion.path
                    d={line}
                    fill="none"
                    stroke="var(--color-brand-500)"
                    strokeWidth="2"
                    strokeLinejoin="round"
                    vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, delay: 0.9, ease: "easeInOut" }}
                  />
                </svg>
                <div className="mt-1 flex justify-between text-[9px] text-slate-400">
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Oct</span>
                </div>
              </Panel>

              <Panel index={5} className="md:col-span-2">
                <PanelTitle action="View all">Upcoming classes</PanelTitle>
                <ul className="space-y-2">
                  {CLASSES.map((c) => (
                    <li key={c.subject} className="flex items-center gap-2.5">
                      <span className="w-8 shrink-0 text-[10px] font-semibold tabular-nums text-slate-500">{c.time}</span>
                      <div className="min-w-0 flex-1 rounded-lg border border-slate-100 bg-slate-50/70 px-2 py-1.5">
                        <p className="truncate text-[10.5px] font-semibold text-slate-800">{c.subject}</p>
                        <p className="text-[9.5px] text-slate-500">{c.group}</p>
                      </div>
                      {c.live && (
                        <span className="flex items-center gap-1 rounded-full bg-red-50 px-1.5 py-0.5 text-[9px] font-bold text-red-600">
                          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> LIVE
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>

            {/* Secondary row: hidden on phones */}
            <div className="hidden gap-2.5 sm:grid sm:grid-cols-2 lg:grid-cols-4">
              <Panel index={6} className="lg:col-span-1">
                <PanelTitle>Assignments</PanelTitle>
                <ul className="space-y-2">
                  {ASSIGNMENTS.map((a) => (
                    <li key={a.title}>
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-[10.5px] font-medium text-slate-700">{a.title}</p>
                        <span className="shrink-0 text-[9.5px] tabular-nums text-slate-400">
                          {a.done}/{a.total}
                        </span>
                      </div>
                      <div className="mt-1 h-1 rounded-full bg-slate-100">
                        <div className="bg-brand-gradient h-1 rounded-full" style={{ width: `${(a.done / a.total) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel index={7}>
                <PanelTitle>Performance</PanelTitle>
                <div className="flex items-center gap-3">
                  <svg viewBox="0 0 36 36" className="h-14 w-14 -rotate-90" aria-hidden="true">
                    <circle cx="18" cy="18" r="15" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                    <circle cx="18" cy="18" r="15" fill="none" stroke="var(--color-brand-500)" strokeWidth="4" strokeLinecap="round" strokeDasharray={`${0.78 * 94.2} 94.2`} />
                  </svg>
                  <div className="space-y-1.5">
                    <div>
                      <p className="text-sm font-bold tabular-nums text-slate-900">78%</p>
                      <p className="text-[9.5px] text-slate-500">Average score</p>
                    </div>
                    <div>
                      <p className="text-sm font-bold tabular-nums text-slate-900">94%</p>
                      <p className="text-[9.5px] text-slate-500">Pass rate, term 1</p>
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel index={8}>
                <PanelTitle>Notifications</PanelTitle>
                <ul className="space-y-2">
                  {NOTIFICATIONS.map((n) => (
                    <li key={n.text} className="flex gap-2">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
                      <p className="min-w-0 flex-1 text-[10px] leading-snug text-slate-600">{n.text}</p>
                      <span className="text-[9px] tabular-nums text-slate-400">{n.time}</span>
                    </li>
                  ))}
                </ul>
              </Panel>

              <Panel index={9}>
                <PanelTitle>Recent activity</PanelTitle>
                <ul className="space-y-2">
                  {ACTIVITY.map((a) => (
                    <li key={a.text} className="flex items-center gap-2">
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[8px] font-bold text-slate-600">{a.who}</span>
                      <p className="min-w-0 flex-1 truncate text-[10px] text-slate-600">{a.text}</p>
                      <span className="text-[9px] text-slate-400">{a.time}</span>
                    </li>
                  ))}
                </ul>
              </Panel>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The small "live" cards that float around the hero dashboard. */
export function FloatingCard({
  children,
  className,
  delay = 0,
  drift = 8,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  drift?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: [0, -drift, 0] }}
      transition={{ opacity: { delay, duration: 0.4 }, y: { delay: delay + 0.4, duration: 5, repeat: Infinity, ease: "easeInOut" } }}
      className={cn(
        "absolute z-10 hidden rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 shadow-[0_12px_40px_-12px_rgb(15_23_42/0.3)] backdrop-blur lg:block",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

