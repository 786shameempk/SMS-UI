import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { getPricingTiers } from "../data";

export default function PricingSection() {
  const { data: tiers = [] } = useQuery({ queryKey: ["marketing", "pricing"], queryFn: getPricingTiers });

  return (
    <section id="pricing" className="scroll-mt-16 bg-slate-50 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Pricing</p>
          <h2 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            One plan for one campus, or a whole network of them
          </h2>
          <p className="mt-4 text-base leading-relaxed text-slate-600">
            Every plan includes the same core platform and real per-tenant data isolation — the difference is scale.
          </p>
        </div>

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
                  ? "border-brand-600 bg-white shadow-xl shadow-brand-900/10 md:-translate-y-3"
                  : "border-slate-200 bg-white shadow-sm",
              )}
            >
              {tier.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                  Most popular
                </span>
              )}

              <h3 className="text-lg font-bold text-slate-900">{tier.name}</h3>
              <p className="mt-1.5 text-sm text-slate-500">{tier.description}</p>

              <p className="mt-6 text-3xl font-extrabold tabular-nums text-slate-900">{tier.priceLabel}</p>

              <ul className="mt-6 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm text-slate-600">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
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
