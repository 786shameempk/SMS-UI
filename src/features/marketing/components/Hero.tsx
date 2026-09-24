import { motion } from "framer-motion";
import { ArrowRight, ArrowUp, Bell, CalendarCheck, MessageCircle, Sparkles, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HERO_STATS } from "../data";
import { useLeadCapture } from "./LeadCapture";

export default function Hero() {
  const { openDemo, openContact } = useLeadCapture();

  return (
    <section className="relative overflow-hidden">
      {/* Decorative gradient mesh background */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 h-[36rem] w-[36rem] -translate-x-[60%] rounded-full bg-brand-200/50 blur-3xl" />
        <div className="absolute -top-24 right-0 h-[28rem] w-[28rem] translate-x-1/3 rounded-full bg-brand-300/30 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            maskImage: "linear-gradient(to bottom, black, transparent 85%)",
          }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-20 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-28">
        <div className="grid items-center gap-14 lg:grid-cols-2 lg:gap-10">
          {/* Copy */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          >
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" />
              New: real multi-branch &amp; multi-tenant isolation
            </div>

            <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem] lg:leading-[1.08]">
              Run your entire school on one connected platform
            </h1>

            <p className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600">
              From admissions to alumni, timetables to transport — EduCore brings 29 modules, live analytics, and
              bank-grade access control into a single, beautifully simple system.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button size="lg" onClick={openDemo} className="group shadow-lg shadow-brand-600/25">
                Request a Demo
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
              <Button size="lg" variant="ghost" onClick={openContact} className="text-slate-700 hover:bg-brand-50 hover:text-brand-700">
                <MessageCircle className="h-4 w-4" />
                Contact Us
              </Button>
            </div>

            <p className="mt-4 text-xs font-medium text-slate-400">
              Free 30-minute walkthrough &middot; Tailored to your school &middot; No commitment
            </p>

            <dl className="mt-12 grid grid-cols-2 gap-6 sm:grid-cols-4">
              {HERO_STATS.map((stat) => (
                <div key={stat.label}>
                  <dt className="text-2xl font-extrabold tabular-nums text-slate-900 sm:text-3xl">{stat.value}</dt>
                  <dd className="mt-1 text-xs font-medium text-slate-500">{stat.label}</dd>
                </div>
              ))}
            </dl>
          </motion.div>

          {/* Product preview mockup */}
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut", delay: 0.15 }}
            className="relative"
          >
            <div className="relative rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl shadow-slate-900/10">
              {/* Browser chrome */}
              <div className="flex items-center gap-1.5 px-3 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                <span className="h-2.5 w-2.5 rounded-full bg-slate-200" />
              </div>

              <div className="flex overflow-hidden rounded-xl border border-slate-100">
                {/* Fake sidebar */}
                <div className="hidden w-14 shrink-0 flex-col items-center gap-3 border-r border-slate-100 bg-slate-50/70 py-4 sm:flex">
                  <div
                    className="h-6 w-6 rounded-md"
                    style={{ background: "linear-gradient(135deg, var(--color-brand-500) 0%, var(--color-brand-700) 100%)" }}
                  />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className={`h-2 w-6 rounded-full ${i === 0 ? "bg-brand-300" : "bg-slate-200"}`} />
                  ))}
                </div>

                {/* Fake content */}
                <div className="min-w-0 flex-1 bg-slate-50/40 p-4">
                  <div className="mb-3 h-2.5 w-28 rounded-full bg-slate-200" />
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { icon: Users, label: "Students", value: "2,384", delta: "+18" },
                      { icon: CalendarCheck, label: "Attendance", value: "92%", delta: "+1.4%" },
                      { icon: Wallet, label: "Fees collected", value: "₹48.1L", delta: "+6.3%" },
                      { icon: Bell, label: "Open tickets", value: "6", delta: "-2" },
                    ].map((card) => (
                      <div key={card.label} className="rounded-lg border border-slate-100 bg-white p-2.5 shadow-sm">
                        <div className="flex items-center justify-between">
                          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-brand-50">
                            <card.icon className="h-3 w-3 text-brand-600" />
                          </div>
                          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-green-600">
                            <ArrowUp className="h-2.5 w-2.5" />
                            {card.delta}
                          </span>
                        </div>
                        <p className="mt-2 text-sm font-bold text-slate-900">{card.value}</p>
                        <p className="text-[10px] font-medium text-slate-400">{card.label}</p>
                      </div>
                    ))}
                  </div>

                  <div className="mt-2.5 rounded-lg border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="mb-2 h-2 w-20 rounded-full bg-slate-200" />
                    <div className="flex h-16 items-end gap-1.5">
                      {[40, 62, 50, 78, 66, 88, 74, 95, 82, 100, 90, 108].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 rounded-t-sm"
                          style={{ height: `${h * 0.55}%`, background: "var(--color-brand-300)" }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating accent cards */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: [0, -8, 0] }}
              transition={{ opacity: { delay: 0.6, duration: 0.4 }, y: { repeat: Infinity, duration: 4, ease: "easeInOut", delay: 1 } }}
              className="absolute -left-6 top-10 hidden rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xl sm:block"
            >
              <p className="text-[10px] font-medium text-slate-400">Branch switched</p>
              <p className="text-xs font-bold text-slate-900">North Campus &rarr; Main Campus</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: [0, 8, 0] }}
              transition={{ opacity: { delay: 0.8, duration: 0.4 }, y: { repeat: Infinity, duration: 4.5, ease: "easeInOut", delay: 1.2 } }}
              className="absolute -bottom-6 -right-4 hidden rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xl sm:block"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" />
                <div>
                  <p className="text-[10px] font-medium text-slate-400">AI Insight</p>
                  <p className="text-xs font-bold text-slate-900">Attendance is healthy overall</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
