import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip } from "recharts";
import { CalendarCheck, LayoutDashboard, Wallet } from "lucide-react";
import { cn } from "@/utils/cn";

const TRENDS: Record<string, Array<{ x: string; y: number }>> = {
  dashboard: [
    { x: "Mar", y: 62 }, { x: "Apr", y: 68 }, { x: "May", y: 64 }, { x: "Jun", y: 74 },
    { x: "Jul", y: 80 }, { x: "Aug", y: 86 }, { x: "Sep", y: 92 },
  ],
  fees: [
    { x: "Mar", y: 30 }, { x: "Apr", y: 42 }, { x: "May", y: 38 }, { x: "Jun", y: 55 },
    { x: "Jul", y: 48 }, { x: "Aug", y: 60 }, { x: "Sep", y: 72 },
  ],
  attendance: [
    { x: "Mon", y: 88 }, { x: "Tue", y: 91 }, { x: "Wed", y: 85 }, { x: "Thu", y: 94 },
    { x: "Fri", y: 89 }, { x: "Sat", y: 96 }, { x: "Sun", y: 92 },
  ],
};

const TABS = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    title: "One glance, the whole school",
    description: "Live enrollment, attendance, revenue, and operational widgets — the same view for admins and principals.",
    rows: [
      { label: "Total students", value: "2,384" },
      { label: "Fees collected (MTD)", value: "₹48.1L" },
      { label: "Attendance today", value: "92%" },
    ],
  },
  {
    id: "fees",
    label: "Fee Management",
    icon: Wallet,
    title: "Invoicing that reconciles itself",
    description: "Structures, discounts, and late fines generate real invoices — paid, pending, and overdue, always in sync with accounting.",
    rows: [
      { label: "Invoices generated", value: "1,204" },
      { label: "Collected this term", value: "₹1.9Cr" },
      { label: "Overdue balance", value: "₹6.2L" },
    ],
  },
  {
    id: "attendance",
    label: "Attendance",
    icon: CalendarCheck,
    title: "Capture it any way that fits",
    description: "Manual, QR, biometric, or face capture — every method lands in the same daily, monthly, and yearly reports.",
    rows: [
      { label: "Marked today", value: "2,192" },
      { label: "Weekly average", value: "90.7%" },
      { label: "Flagged low-attendance", value: "14" },
    ],
  },
];

export default function ProductPreview() {
  const [active, setActive] = useState(TABS[0].id);
  const tab = TABS.find((t) => t.id === active) ?? TABS[0];

  return (
    <section className="bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">See it in action</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            A different module every click, the same familiar system
          </h2>
        </div>

        <div className="mx-auto mt-10 flex max-w-xl flex-wrap items-center justify-center gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActive(t.id)}
              className={cn(
                "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors",
                active === t.id
                  ? "border-brand-600 bg-brand-600 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900",
              )}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative mt-10 overflow-hidden rounded-2xl border border-slate-200 bg-white p-3 shadow-xl shadow-slate-900/5 sm:p-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="grid gap-6 rounded-xl border border-slate-100 bg-slate-50/50 p-5 sm:p-8 lg:grid-cols-[1fr_1.1fr] lg:items-center"
            >
              <div>
                <h3 className="text-xl font-bold text-slate-900 sm:text-2xl">{tab.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-slate-600 sm:text-base">{tab.description}</p>
                <dl className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                  {tab.rows.map((row) => (
                    <div key={row.label} className="flex items-center justify-between rounded-lg border border-slate-100 bg-white px-4 py-3 shadow-sm">
                      <dt className="text-xs font-medium text-slate-500">{row.label}</dt>
                      <dd className="text-sm font-bold tabular-nums text-slate-900">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="h-56 w-full rounded-xl border border-slate-100 bg-white p-4 shadow-sm sm:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={TRENDS[tab.id]} margin={{ left: 0, right: 8, top: 8, bottom: 0 }}>
                    <defs>
                      <linearGradient id="previewGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Tooltip
                      contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 12 }}
                      labelStyle={{ fontWeight: 600 }}
                    />
                    <Area type="monotone" dataKey="y" stroke="var(--color-brand-500)" strokeWidth={2.5} fill="url(#previewGradient)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
