import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { Bell, Bus, Check, CheckCircle2, ClipboardCheck, Megaphone, WifiOff } from "lucide-react";
import { cn } from "@/utils/cn";
import { MOBILE_APP_HIGHLIGHTS, MOBILE_APPS, type MobileAppId } from "../data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

// ── A tiny phone screen per app ─────────────────────────────────────

function Phone({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto w-[11.5rem] rounded-[1.75rem] border-[5px] border-slate-900 bg-slate-900 shadow-[0_24px_50px_-24px_rgb(15_23_42/0.55)]">
      <div className="relative overflow-hidden rounded-[1.35rem] bg-white">
        <span className="absolute left-1/2 top-1.5 h-1.5 w-12 -translate-x-1/2 rounded-full bg-slate-900" aria-hidden="true" />
        <div className="space-y-2 px-3 pb-4 pt-6">{children}</div>
      </div>
    </div>
  );
}

function Row({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5 text-[10px] text-slate-700", className)}>{children}</div>;
}

function FamilyScreen() {
  return (
    <Phone>
      <p className="text-[11px] font-semibold text-slate-900">Hi, Aarav&apos;s parent</p>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="rounded-lg bg-emerald-50 px-2 py-1.5">
          <p className="text-[9px] text-emerald-700">Attendance</p>
          <p className="text-sm font-bold text-emerald-700">96%</p>
        </div>
        <div className="rounded-lg bg-amber-50 px-2 py-1.5">
          <p className="text-[9px] text-amber-700">Fees due</p>
          <p className="text-sm font-bold text-amber-700">₹4,200</p>
        </div>
      </div>
      <Row>
        <Bus className="h-3 w-3 shrink-0 text-brand-600" /> Bus is 3 stops away
      </Row>
      <Row>
        <ClipboardCheck className="h-3 w-3 shrink-0 text-brand-600" /> Science worksheet · due Fri
      </Row>
      <span className="bg-brand-gradient block rounded-lg py-1.5 text-center text-[10px] font-semibold text-white">Pay fees</span>
    </Phone>
  );
}

function TeacherScreen() {
  const students = [
    { name: "Aarav S.", status: "P", cls: "bg-emerald-50 text-emerald-700" },
    { name: "Diya K.", status: "P", cls: "bg-emerald-50 text-emerald-700" },
    { name: "Kabir M.", status: "A", cls: "bg-rose-50 text-rose-700" },
    { name: "Meera R.", status: "L", cls: "bg-amber-50 text-amber-700" },
  ];
  return (
    <Phone>
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-slate-900">Grade 6 A register</p>
        <WifiOff className="h-3 w-3 text-slate-400" aria-hidden="true" />
      </div>
      {students.map((s) => (
        <Row key={s.name} className="justify-between">
          {s.name}
          <span className={cn("flex h-4 w-4 items-center justify-center rounded text-[9px] font-bold", s.cls)}>{s.status}</span>
        </Row>
      ))}
      <p className="text-center text-[9px] text-slate-400">Saved offline · syncs when online</p>
    </Phone>
  );
}

function StaffScreen() {
  return (
    <Phone>
      <p className="text-[11px] font-semibold text-slate-900">Good morning, Priya</p>
      <Row>
        <Megaphone className="h-3 w-3 shrink-0 text-brand-600" /> Annual day on 14 Dec
      </Row>
      <Row>
        <Bell className="h-3 w-3 shrink-0 text-amber-600" /> 3 items need your action
      </Row>
      <Row>
        <CheckCircle2 className="h-3 w-3 shrink-0 text-emerald-600" /> Office: request approved
      </Row>
      <span className="block rounded-lg border border-slate-200 py-1.5 text-center text-[10px] font-semibold text-slate-700">Open messages</span>
    </Phone>
  );
}

const SCREENS: Record<MobileAppId, () => ReactNode> = {
  family: FamilyScreen,
  teacher: TeacherScreen,
  staff: StaffScreen,
};

// ── Section ─────────────────────────────────────────────────────────

/** The three mobile apps, one card each, with a small phone preview on top. */
export default function MobileAppsSection() {
  return (
    <section id="mobile-apps" className="scroll-mt-16 border-t border-slate-200/70 bg-slate-50/70 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Mobile apps"
            title={
              <>
                Three apps. <span className="text-brand-gradient">Your whole school</span> on the go.
              </>
            }
            description="Dedicated Android and iOS apps for students and parents, teachers, and non-teaching staff — each built around what that person needs every day, all running on the same school account."
          />
        </Reveal>

        <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {MOBILE_APPS.map((app, i) => {
            const Screen = SCREENS[app.id];
            return (
              <Reveal key={app.id} delay={0.08 * i} className="h-full">
                <article className="flex h-full flex-col rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_50px_-30px_rgb(15_23_42/0.25)] sm:p-7">
                  <div className="relative isolate rounded-2xl bg-gradient-to-b from-brand-50 to-white pt-6">
                    <motion.div
                      initial={{ y: 16, opacity: 0 }}
                      whileInView={{ y: 0, opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: 0.15 + i * 0.08, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <Screen />
                    </motion.div>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <span className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm">
                      <app.icon className="h-[18px] w-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">{app.audience}</p>
                      <h3 className="text-base font-bold tracking-tight text-slate-900">{app.name}</h3>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{app.description}</p>

                  <ul className="mt-5 space-y-2.5">
                    {app.features.map((f) => (
                      <li key={f} className="flex gap-2.5 text-sm text-slate-700">
                        <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                          <Check className="h-3 w-3" strokeWidth={2.5} />
                        </span>
                        {f}
                      </li>
                    ))}
                  </ul>
                </article>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.15} className="mt-12">
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Included in every School Sphere app">
            {MOBILE_APP_HIGHLIGHTS.map((h) => (
              <li key={h.label} className="flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm font-medium text-slate-700">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-700">
                  <h.icon className="h-4 w-4" />
                </span>
                {h.label}
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
