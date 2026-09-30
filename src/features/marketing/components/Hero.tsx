import { motion } from "framer-motion";
import { ArrowRight, CircleCheck, IndianRupee, Sparkles, UserRoundSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MODULE_COUNT } from "../data";
import DashboardMockup, { FloatingCard } from "./DashboardMockup";
import { useLeadCapture } from "./LeadCapture";

const ease = [0.22, 1, 0.36, 1] as const;

export default function Hero() {
  const { openDemo } = useLeadCapture();

  return (
    // -mt-16/pt-16 lets the backdrop run up under the transparent sticky header.
    <section className="relative isolate -mt-16 overflow-hidden pt-16">
      {/* Backdrop: warm glow, fine grid, and a soft horizon */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-1/2 top-[-18rem] h-[42rem] w-[70rem] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-brand-200),transparent)] opacity-70" />
        <div
          className="absolute inset-0 opacity-[0.5]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(148 163 184 / 0.18) 1px, transparent 1px), linear-gradient(to bottom, rgb(148 163 184 / 0.18) 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse 70% 55% at 50% 0%, black 30%, transparent 75%)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-b from-transparent to-white" />
      </div>

      <div className="mx-auto max-w-7xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
        <div className="mx-auto max-w-4xl text-center">
          <motion.a
            href="#features"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease }}
            className="group inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/80 py-1 pl-1 pr-3 text-xs font-medium text-slate-600 shadow-sm backdrop-blur transition-colors hover:border-brand-300"
          >
            <span className="bg-brand-gradient rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
            Online classes, study materials<span className="hidden sm:inline"> &amp; talent showcase</span>
            <ArrowRight className="h-3 w-3 text-slate-400 transition-transform group-hover:translate-x-0.5" />
          </motion.a>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05, ease }}
            className="mt-7 text-[2.6rem] font-bold leading-[1.05] tracking-[-0.035em] text-balance text-slate-950 sm:text-6xl lg:text-7xl"
          >
            Everything Your School Needs.{" "}
            <span className="text-brand-gradient">One Smarter Platform.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12, ease }}
            className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-pretty text-slate-600 sm:text-lg"
          >
            Bring administration, academics, communication, and everyday school operations together in one simple and
            intelligent platform — for administrators, teachers, students, and parents.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease }}
            className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center"
          >
            <Button size="lg" onClick={openDemo} className="group h-12 px-6 text-[15px] shadow-lg shadow-brand-600/25">
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button size="lg" variant="outline" asChild className="h-12 bg-white/80 px-6 text-[15px] backdrop-blur">
              <a href="#features">Explore Features</a>
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-5 text-xs font-medium text-slate-500"
          >
            Guided setup &middot; {MODULE_COUNT} modules, one login &middot; Works on any device
          </motion.p>
        </div>

        {/* Product preview */}
        <div className="relative mx-auto mt-14 max-w-6xl sm:mt-20 [perspective:2000px]">
          <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-10 -z-10 rounded-[3rem] bg-[radial-gradient(closest-side,var(--color-brand-300),transparent)] opacity-40 blur-2xl" />

          <motion.div
            initial={{ opacity: 0, y: 40, rotateX: 14 }}
            animate={{ opacity: 1, y: 0, rotateX: 0 }}
            transition={{ duration: 1, delay: 0.3, ease }}
            style={{ transformOrigin: "50% 0%" }}
            className="rounded-[1.25rem] border border-white/60 bg-white/40 p-1.5 shadow-2xl shadow-slate-900/10 backdrop-blur sm:p-2"
          >
            <DashboardMockup />
          </motion.div>

          <FloatingCard className="-left-10 top-24" delay={1.3}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50">
                <CircleCheck className="h-4 w-4 text-emerald-600" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Attendance marked · Grade 9 B</p>
                <p className="text-[13px] font-semibold text-slate-900">38 of 40 students present</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="-right-8 top-40" delay={1.5} drift={10}>
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50">
                <IndianRupee className="h-4 w-4 text-brand-700" />
              </span>
              <div>
                <p className="text-[11px] font-medium text-slate-500">Payment received · Invoice #1204</p>
                <p className="text-[13px] font-semibold text-slate-900">₹12,500 paid online</p>
              </div>
            </div>
          </FloatingCard>

          <FloatingCard className="-left-6 bottom-16" delay={1.7} drift={6}>
            <div className="flex items-start gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900">
                <UserRoundSearch className="h-4 w-4 text-brand-300" />
              </span>
              <div>
                <p className="flex items-center gap-1 text-[11px] font-medium text-slate-500">
                  <Sparkles className="h-3 w-3 text-brand-600" /> Needs attention
                </p>
                <p className="text-[13px] font-semibold text-slate-900">6 students below 75% attendance</p>
              </div>
            </div>
          </FloatingCard>
        </div>
      </div>
    </section>
  );
}
