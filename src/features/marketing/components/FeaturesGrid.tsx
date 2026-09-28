import { motion } from "framer-motion";
import { FEATURES } from "../data";
import SectionHeading from "./SectionHeading";

export default function FeaturesGrid() {
  return (
    <section id="features" className="scroll-mt-16 bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Everything, connected"
          title="Every department your school runs, built in"
          description="No more stitching together spreadsheets and disconnected tools. One data model, one login, one place to look for the truth."
        />

        <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: (index % 3) * 0.08, ease: "easeOut" }}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-900/5"
            >
              {/* Hover accents: gradient top edge + warm corner glow */}
              <div
                className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
                style={{ background: "linear-gradient(90deg, var(--color-brand-400), var(--color-brand-600))" }}
              />
              <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-200/0 blur-2xl transition-colors duration-500 group-hover:bg-brand-200/60" />

              <div className="relative">
                <div className="bg-brand-gradient flex h-11 w-11 items-center justify-center rounded-xl shadow-md shadow-brand-600/20 transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                  <feature.icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="mt-5 text-base font-bold text-slate-900">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{feature.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
