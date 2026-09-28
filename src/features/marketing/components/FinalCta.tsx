import { motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeadCapture } from "./LeadCapture";

export default function FinalCta() {
  const { openDemo, openContact } = useLeadCapture();

  return (
    <section className="bg-white px-4 py-20 sm:px-6 sm:py-24 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative isolate mx-auto max-w-6xl overflow-hidden rounded-3xl px-6 py-16 text-center shadow-2xl shadow-brand-900/20 sm:px-12 sm:py-20"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{ background: "linear-gradient(135deg, var(--color-brand-700) 0%, var(--color-brand-900) 100%)" }}
        />
        <div className="absolute -left-20 -top-24 -z-10 h-72 w-72 rounded-full bg-brand-400/40 blur-3xl" />
        <div className="absolute -bottom-32 -right-16 -z-10 h-80 w-80 rounded-full bg-brand-500/30 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 -z-10 opacity-15"
          style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          }}
        />

        <h2 className="mx-auto max-w-2xl text-3xl font-extrabold tracking-tight text-balance text-white sm:text-4xl">
          Ready to bring your school into one system?
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-100">
          Book a free, personalised walkthrough with our team — or drop us a message and we'll get right back to you.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button size="lg" onClick={openDemo} className="group bg-white text-brand-800 shadow-lg hover:bg-brand-50 hover:opacity-100">
            Request a Demo
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Button>
          <Button
            size="lg"
            variant="ghost"
            onClick={openContact}
            className="border border-white/25 text-white hover:bg-white/10 hover:text-white"
          >
            <MessageCircle className="h-4 w-4" />
            Contact Us
          </Button>
        </div>

        <p className="mt-5 text-xs font-medium text-brand-200">We usually reply within one business day</p>
      </motion.div>
    </section>
  );
}
