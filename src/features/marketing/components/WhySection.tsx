import { motion } from "framer-motion";
import { WHY_ITEMS } from "../data";
import SectionHeading from "./SectionHeading";

export default function WhySection() {
  return (
    <section id="why" className="relative scroll-mt-16 overflow-hidden bg-slate-950 py-20 sm:py-28">
      {/* Brand glows + faint grid */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />
        <div className="absolute -bottom-40 right-0 h-[28rem] w-[28rem] rounded-full bg-brand-700/25 blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "56px 56px",
            maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
          }}
        />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16">
          <SectionHeading
            align="left"
            inverted
            eyebrow="Why EduCore"
            title={
              <>
                Built like real enterprise software,{" "}
                <span className="bg-gradient-to-r from-brand-300 to-brand-500 bg-clip-text text-transparent">
                  priced like a school tool
                </span>
              </>
            }
            description="Most school software either looks dated or costs like it was built for a hospital chain. EduCore is architected the way modern SaaS products are — real tenant isolation, real audit trails, real analytics — without the enterprise sales cycle."
          />

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {WHY_ITEMS.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
                className="group rounded-2xl border border-white/10 bg-white/[0.04] p-6 backdrop-blur-sm transition-colors duration-300 hover:border-brand-400/40 hover:bg-white/[0.07]"
              >
                <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-brand-400/30 bg-brand-500/10 transition-transform duration-300 group-hover:scale-110">
                  <item.icon className="h-5 w-5 text-brand-300" />
                </div>
                <h3 className="mt-5 text-base font-bold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
