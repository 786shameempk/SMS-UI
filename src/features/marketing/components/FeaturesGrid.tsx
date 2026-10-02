import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { FEATURES, MODULE_COUNT, NEW_MODULES } from "../data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-16 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Features"
            title="One School Management System for Every Department"
            description="Student management, attendance, academics, fees, and communication run on one connected school ERP — one login, one source of truth, and no spreadsheets to reconcile."
          />
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: (index % 4) * 0.07, ease: "easeOut" }}
              className={cn(
                "group relative overflow-hidden rounded-2xl border p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_50px_-20px_rgb(15_23_42/0.18)]",
                feature.featured
                  ? "border-brand-300/80 bg-gradient-to-br from-brand-50 via-white to-white hover:border-brand-400"
                  : "border-slate-200/80 bg-white hover:border-slate-300",
              )}
            >
              {/* Hover glow (always on for the featured tile) */}
              <div
                className={cn(
                  "pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full blur-3xl transition-colors duration-500 group-hover:bg-brand-200/50",
                  feature.featured ? "bg-brand-200/40" : "bg-brand-200/0",
                )}
              />

              <div className="relative">
                <div className="flex items-start justify-between gap-2">
                  <div
                    className={cn(
                      "flex h-11 w-11 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-105",
                      feature.featured ? "bg-brand-gradient border-transparent text-white" : "border-brand-200/70 bg-gradient-to-b from-brand-50 to-brand-100/60 text-brand-700",
                    )}
                  >
                    <feature.icon className="h-5 w-5" strokeWidth={1.9} />
                  </div>
                  {feature.featured && (
                    <span className="bg-brand-gradient rounded-full px-2 py-0.5 text-[11px] font-semibold text-white">New</span>
                  )}
                </div>
                <h3 className="mt-5 text-[15px] font-semibold tracking-tight text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                {feature.featured && (
                  <a href="#ai" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 hover:text-brand-800">
                    See AI in action <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>

        <Reveal delay={0.1} className="mt-8">
          <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-5 py-4 sm:flex-row">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{MODULE_COUNT} modules in total</span> — including what's new this term:
            </p>
            <ul className="flex flex-wrap justify-center gap-2">
              {NEW_MODULES.map((m) => (
                <li key={m.label}>
                  <a
                    href={m.href}
                    className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-300 hover:text-slate-900"
                  >
                    <m.icon className="h-3.5 w-3.5 text-brand-700" />
                    {m.label}
                    <ArrowUpRight className="h-3 w-3 text-slate-400 transition-transform group-hover:-translate-y-px group-hover:translate-x-px" />
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
