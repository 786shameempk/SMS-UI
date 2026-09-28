import { PARTNERS, type Partner } from "../data";

function PartnerLogo({ partner }: { partner: Partner }) {
  if (partner.logoUrl) {
    return <img src={partner.logoUrl} alt={partner.name} className="h-10 w-auto object-contain" loading="lazy" />;
  }

  // No logo file yet - draw a simple crest + wordmark in the partner's colour.
  const Icon = partner.icon;
  return (
    <div className="flex items-center gap-3">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
        style={{ background: `linear-gradient(135deg, ${partner.color}cc 0%, ${partner.color} 100%)` }}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-left leading-tight">
        <p className="whitespace-nowrap text-sm font-bold text-slate-900">{partner.name}</p>
        <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{partner.location}</p>
      </div>
    </div>
  );
}

export default function Partners() {
  return (
    <section className="border-y border-slate-200/70 bg-slate-50/70 py-12 sm:py-14">
      <p className="px-4 text-center text-sm font-semibold uppercase tracking-wider text-slate-500">
        Trusted by schools and education partners
      </p>

      <div className="mask-fade-x mt-6 overflow-hidden py-3">
        {/* The list is rendered twice so the marquee can loop seamlessly; the copy is hidden from screen readers. */}
        <div className="animate-marquee flex w-max">
          {[...PARTNERS, ...PARTNERS].map((partner, index) => (
            <div
              key={`${partner.name}-${index}`}
              aria-hidden={index >= PARTNERS.length}
              className="mr-4 flex shrink-0 items-center rounded-2xl border border-slate-200 bg-white px-6 py-4 grayscale transition duration-300 hover:-translate-y-0.5 hover:grayscale-0 hover:shadow-md"
            >
              <PartnerLogo partner={partner} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
