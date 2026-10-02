import { motion } from "framer-motion";
import { STEPS } from "../data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-16 bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading eyebrow="How it works" title="Set Up Your School ERP in Three Steps" description="No lengthy implementation project. Our team helps you move over from spreadsheets or your current system." />
        </Reveal>

        <ol className="relative mt-16 grid gap-10 md:grid-cols-3 md:gap-8">
          {/* Connector line on desktop */}
          <div className="pointer-events-none absolute left-[16%] right-[16%] top-7 hidden h-px bg-gradient-to-r from-transparent via-slate-300 to-transparent md:block" aria-hidden="true" />

          {STEPS.map((step, i) => (
            <motion.li
              key={step.number}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: i * 0.12, ease: "easeOut" }}
              className="relative text-center"
            >
              <div className="relative mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-[0_8px_24px_-12px_rgb(15_23_42/0.25)]">
                <step.icon className="h-6 w-6 text-brand-700" strokeWidth={1.8} />
                <span className="bg-brand-gradient absolute -right-2 -top-2 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-white shadow-sm">
                  {step.number}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold tracking-tight text-slate-900">{step.title}</h3>
              <p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-slate-600">{step.description}</p>
            </motion.li>
          ))}
        </ol>
      </div>
    </section>
  );
}
