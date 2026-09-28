import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { getPricingTiers } from "../data";
import SectionHeading from "./SectionHeading";

export default function PricingSection() {
  const { data: tiers = [] } = useQuery({ queryKey: ["marketing", "pricing"], queryFn: getPricingTiers });

  return (
    <section id="pricing" className="scroll-mt-16 bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Pricing"
          title="One plan for one campus, or a whole network of them"
          description="Every plan includes the same core platform and real per-tenant data isolation — the difference is scale."
        />

        <div className="mx-auto mt-14 grid max-w-5xl grid-cols-1 gap-6 md:grid-cols-3">
          {tiers.map((tier, index) => (
            <motion.div
              key={tier.id}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
              className={cn(
                "relative flex flex-col rounded-2xl border p-7",
                tier.highlighted
                  ? "border-brand-400 bg-gradient-to-b from-brand-50 to-white shadow-2xl shadow-brand-900/15 ring-1 ring-brand-400/60 md:-translate-y-3"
                  : "border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg",
              )}
            >
              {tier.highlighted && (
                <span className="bg-brand-gradient absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md shadow-brand-600/30">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{tier.description}</p>

              <p className="mt-6 border-b border-slate-200/70 pb-6 text-4xl font-extrabold tracking-tight tabular-nums text-slate-900">{tier.priceLabel}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100">
                      <Check className="h-2.5 w-2.5 text-brand-700" strokeWidth={3} />
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button asChild size="lg" variant={tier.highlighted ? "default" : "outline"} className="mt-7">
                <Link to="/login">Get started with {tier.name}</Link>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
