import { motion } from "framer-motion";
import { ArrowRight, Check, MessageSquareQuote } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { PLAN_ASSURANCES, PLAN_SOLUTIONS } from "../data";
import { useLeadCapture } from "./LeadCapture";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

/**
 * Plans & Solutions. Deliberately not a price table: School Sphere's pricing is private and shared through a
 * quote, so each card says what the plan is for and what it includes, and every CTA opens the quote form.
 */
export default function PlansSection() {
  const { openQuote } = useLeadCapture();

  return (
    <section id="plans" className="scroll-mt-16 border-t border-slate-200/70 bg-slate-50/70 py-24 sm:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="Plans & Solutions"
            title="School Management Software Plans for Every School"
            description="Flexible plans for schools of every size, with more capabilities as you grow. Tailored to your requirements, with custom solutions available."
          />
        </Reveal>

        <div className="mx-auto mt-14 grid max-w-6xl grid-cols-1 gap-6 md:grid-cols-3">
          {PLAN_SOLUTIONS.map((plan, index) => (
            <motion.article
              key={plan.key}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.4, delay: index * 0.08, ease: "easeOut" }}
              aria-labelledby={`plan-${plan.key}`}
              className={cn(
                "relative flex flex-col rounded-3xl border p-7 sm:p-8",
                plan.highlighted
                  ? "border-brand-400 bg-gradient-to-b from-brand-50 via-white to-white shadow-2xl shadow-brand-900/15 ring-1 ring-brand-400/60 md:-translate-y-3"
                  : "border-slate-200 bg-white shadow-sm transition-shadow duration-300 hover:shadow-lg",
              )}
            >
              {plan.highlighted && (
                <span className="bg-brand-gradient absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold text-primary-foreground shadow-md shadow-brand-600/30">
                  Most Popular
                </span>
              )}

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-11 w-11 items-center justify-center rounded-xl",
                    plan.highlighted ? "bg-brand-gradient text-primary-foreground shadow-md shadow-brand-600/25" : "bg-brand-50 text-brand-700 ring-1 ring-brand-100",
                  )}
                >
                  <plan.icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 id={`plan-${plan.key}`} className="text-xl font-bold text-slate-900">
                    {plan.key}
                  </h3>
                  <p className="text-sm text-slate-500">{plan.subtitle}</p>
                </div>
              </div>

              {/* In place of a price: a quiet note that terms are tailored. */}
              <p className="mt-6 flex items-center gap-2 border-b border-slate-200/70 pb-6 text-sm font-semibold text-brand-700">
                <MessageSquareQuote className="h-4 w-4" />
                {plan.pricingNote}
              </p>

              <ul className="mt-6 flex-1 space-y-3" aria-label={`${plan.key} includes`}>
                {plan.features.map((feature, i) => {
                  const inherits = i === 0 && feature.startsWith("Everything in");
                  return (
                    <li key={feature} className={cn("flex items-start gap-2.5 text-sm", inherits ? "font-semibold text-slate-800" : "text-slate-600")}>
                      <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full", inherits ? "bg-brand-500" : "bg-brand-100")}>
                        <Check className={cn("h-2.5 w-2.5", inherits ? "text-white" : "text-brand-700")} strokeWidth={3} />
                      </span>
                      {feature}
                    </li>
                  );
                })}
              </ul>

              <Button size="lg" variant={plan.highlighted ? "default" : "outline"} className="group mt-8" onClick={() => openQuote(plan.key)}>
                {plan.cta}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Button>
            </motion.article>
          ))}
        </div>

        <Reveal className="mx-auto mt-14 grid max-w-6xl gap-4 sm:grid-cols-3">
          {PLAN_ASSURANCES.map((item) => (
            <div key={item.title} className="flex items-start gap-3 rounded-2xl border border-slate-200/80 bg-white/70 p-5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                <item.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">{item.title}</p>
                <p className="mt-0.5 text-sm text-slate-600">{item.description}</p>
              </div>
            </div>
          ))}
        </Reveal>

        <Reveal className="mt-10 text-center">
          <p className="text-sm text-slate-600">
            Not sure which plan fits?{" "}
            <button type="button" onClick={() => openQuote()} className="cursor-pointer font-semibold text-brand-700 underline-offset-4 hover:underline">
              Contact us for pricing
            </button>{" "}
            and we'll recommend the right setup for your school.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
