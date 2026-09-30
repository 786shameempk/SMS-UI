import { TRUST_BADGES, VALUE_PILLARS } from "../data";
import Reveal from "./Reveal";

export default function ValueStrip() {
  return (
    <section aria-label="Why schools choose School Sphere" className="border-y border-slate-200/70 bg-white">
      <Reveal className="mx-auto flex max-w-7xl flex-col items-center gap-5 px-4 py-8 sm:px-6 lg:flex-row lg:justify-between lg:px-8">
        <p className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-[15px] font-semibold tracking-tight text-slate-900 sm:text-base">
          {VALUE_PILLARS.map((pillar, i) => (
            <span key={pillar} className="flex items-center gap-3">
              {i > 0 && <span className="h-1 w-1 rounded-full bg-brand-500" aria-hidden="true" />}
              {pillar}
            </span>
          ))}
        </p>
        <ul className="flex flex-wrap items-center justify-center gap-2">
          {TRUST_BADGES.map((badge) => (
            <li key={badge.label} className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-medium text-slate-600">
              <badge.icon className="h-3.5 w-3.5 text-brand-700" />
              {badge.label}
            </li>
          ))}
        </ul>
      </Reveal>
    </section>
  );
}
