import { motion } from "framer-motion";
import { ArrowRight, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeadCapture } from "./LeadCapture";

export default function FinalCta() {
  const { openDemo, openContact } = useLeadCapture();

  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "linear-gradient(135deg, var(--color-brand-600) 0%, var(--color-brand-800) 100%)" }}
      />
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Ready to bring your school into one system?
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-brand-100">
            Book a free, personalised walkthrough with our team — or drop us a message and we'll get right back to you.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button size="lg" onClick={openDemo} className="group bg-white text-brand-700 hover:bg-brand-50 hover:opacity-100">
              Request a Demo
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Button>
            <Button size="lg" variant="ghost" onClick={openContact} className="text-white hover:bg-white/10 hover:text-white">
              <MessageCircle className="h-4 w-4" />
              Contact Us
            </Button>
          </div>

          <p className="mt-5 text-xs font-medium text-brand-200">We usually reply within one business day</p>
        </motion.div>
      </div>
    </section>
  );
}
