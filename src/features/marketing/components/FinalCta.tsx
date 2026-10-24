import { ArrowRight, CalendarCheck2 } from "lucide-react";
import { Trans, useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { useLeadCapture } from "./LeadCapture";
import Reveal from "./Reveal";

export default function FinalCta() {
  const { openDemo, openContact } = useLeadCapture();
  const { t } = useTranslation("marketing");

  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-28 lg:px-8">
      <Reveal className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-[2rem] bg-slate-950 px-6 py-16 text-center shadow-2xl shadow-slate-900/25 sm:px-12 sm:py-24">
        {/* Gradient light + grid */}
        <div className="absolute left-1/2 top-0 -z-10 h-[28rem] w-[48rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,var(--color-brand-500),transparent)] opacity-40" />
        <div className="absolute -bottom-40 -end-20 -z-10 h-80 w-80 rounded-full bg-brand-700/30 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgb(255 255 255 / 0.5) 1px, transparent 1px), linear-gradient(to bottom, rgb(255 255 255 / 0.5) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
            maskImage: "radial-gradient(ellipse at top, black 20%, transparent 70%)",
          }}
        />

        <h2 className="mx-auto max-w-3xl text-3xl font-bold tracking-[-0.03em] text-balance text-white sm:text-5xl">
          <Trans t={t} i18nKey="Ready to Build a <hl>Smarter School?</hl>" components={{ hl: <span className="text-brand-gradient" /> }} />
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
          {t("Bring your school's people, processes, and information together in one AI school management system.")}
        </p>

        <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button size="lg" onClick={openDemo} className="group h-12 px-6 text-[15px] shadow-lg shadow-brand-500/30">
            {t("Get Started")}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={openDemo}
            className="h-12 border border-white/20 px-6 text-[15px] text-white hover:bg-white/10 hover:text-white"
          >
            <CalendarCheck2 className="h-4 w-4" />
            {t("Book a Demo")}
          </Button>
        </div>

        <p className="mt-6 text-xs font-medium text-slate-400">
          {t("Free 30-minute walkthrough · No commitment ·")}{" "}
          <button type="button" onClick={openContact} className="underline decoration-slate-600 underline-offset-2 hover:text-white">
            {t("Questions? Talk to us")}
          </button>
        </p>
      </Reveal>
    </section>
  );
}
