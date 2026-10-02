import { ChevronDown } from "lucide-react";
import { FAQS } from "../data";
import SectionHeading from "./SectionHeading";
import Reveal from "./Reveal";

// Built from the same FAQS the page renders, so the structured data always matches the visible answers.
const FAQ_SCHEMA = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQS.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: { "@type": "Answer", text: f.answer },
  })),
});

export default function FaqSection() {
  return (
    <section id="faq" className="scroll-mt-16 bg-white py-24 sm:py-32">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: FAQ_SCHEMA }} />
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <SectionHeading
            eyebrow="FAQ"
            title="AI School Management System FAQs"
            description="Answers to the questions schools ask most before switching to School Sphere."
          />
        </Reveal>

        {/* Native <details>: answers stay in the DOM (crawlable) and work without JavaScript. */}
        <div className="mt-14 divide-y divide-slate-200 rounded-2xl border border-slate-200/80 bg-white">
          {FAQS.map((faq) => (
            <details key={faq.question} className="group px-5 sm:px-6 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left">
                <h3 className="text-[15px] font-semibold tracking-tight text-slate-900">{faq.question}</h3>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" />
              </summary>
              <p className="-mt-1 pb-5 text-sm leading-relaxed text-slate-600">{faq.answer}</p>
            </details>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-slate-600">
          Want to see it for your school?{" "}
          <a href="#features" className="font-medium text-brand-700 underline-offset-4 hover:underline">
            Explore School Sphere&apos;s school management features
          </a>{" "}
          or{" "}
          <a href="#plans" className="font-medium text-brand-700 underline-offset-4 hover:underline">
            compare school ERP plans
          </a>
          .
        </p>
      </div>
    </section>
  );
}
