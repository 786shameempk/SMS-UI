import { motion } from "framer-motion";
import { TESTIMONIALS } from "../data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

function initialsOf(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function Testimonials() {
  return (
    <section className="bg-white py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading eyebrow="Testimonials" title="Loved by the People Who Run Schools" />
        </Reveal>

        <div className="mt-16 grid grid-cols-1 gap-5 md:grid-cols-3">
          {TESTIMONIALS.map((t, index) => (
            <motion.figure
              key={t.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: index * 0.1, ease: "easeOut" }}
              className="flex flex-col rounded-2xl border border-slate-200/80 bg-white p-7 shadow-[0_1px_2px_rgb(15_23_42/0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_-24px_rgb(15_23_42/0.2)]"
            >
              <svg viewBox="0 0 24 24" className="h-7 w-7 text-brand-400" fill="currentColor" aria-hidden="true">
                <path d="M9.6 5C6 6.6 4 9.5 4 13.2V19h6v-6H7c0-2.4 1.2-4.2 3.6-5.3L9.6 5Zm10 0C16 6.6 14 9.5 14 13.2V19h6v-6h-3c0-2.4 1.2-4.2 3.6-5.3L19.6 5Z" />
              </svg>
              <blockquote className="mt-5 flex-1 text-[15px] leading-relaxed text-slate-700">&ldquo;{t.quote}&rdquo;</blockquote>
              <figcaption className="mt-7 flex items-center gap-3 border-t border-slate-100 pt-5">
                <div className="bg-brand-gradient flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                  {initialsOf(t.name)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{t.name}</p>
                  <p className="truncate text-xs text-slate-500">
                    {t.role}, {t.school}
                  </p>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
