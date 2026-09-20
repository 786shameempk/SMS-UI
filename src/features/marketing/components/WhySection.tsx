import { motion } from "framer-motion";
import { WHY_ITEMS } from "../data";

export default function WhySection() {
  return (
    <section id="why" className="scroll-mt-16 bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Why EduCore</p>
            <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              Built like real enterprise software, priced like a school tool
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              Most school software either looks dated or costs like it was built for a hospital chain. EduCore is
              architected the way modern SaaS products are — real tenant isolation, real audit trails, real
              analytics — without the enterprise sales cycle.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {WHY_ITEMS.map((item, index) => (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
                className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <item.icon className="h-6 w-6 text-brand-600" />
                <h3 className="mt-4 text-base font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
