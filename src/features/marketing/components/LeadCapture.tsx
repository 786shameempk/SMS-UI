import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import ContactWidget from "./ContactWidget";
import QuoteRequestDialog from "./QuoteRequestDialog";
import RequestDemoDialog from "./RequestDemoDialog";

interface LeadCaptureContextValue {
  openDemo: () => void;
  openContact: () => void;
  /** Opens "Request a Quote", optionally with a plan preselected. */
  openQuote: (plan?: string) => void;
}

const LeadCaptureContext = createContext<LeadCaptureContextValue | null>(null);

/** Hosts the landing page's "Request a Demo" and "Request a Quote" dialogs and the floating "Contact Us" widget, so any CTA can open them. */
export function LeadCaptureProvider({ children }: { children: ReactNode }) {
  const [demoOpen, setDemoOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);
  const [quote, setQuote] = useState<{ open: boolean; plan?: string }>({ open: false });

  const value = useMemo(
    () => ({
      openDemo: () => {
        setContactOpen(false);
        setDemoOpen(true);
      },
      openContact: () => setContactOpen(true),
      openQuote: (plan?: string) => {
        setContactOpen(false);
        setQuote({ open: true, plan });
      },
    }),
    [],
  );

  return (
    <LeadCaptureContext.Provider value={value}>
      {children}
      <RequestDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
      <QuoteRequestDialog open={quote.open} onOpenChange={(open) => setQuote((q) => ({ ...q, open }))} defaults={{ plan: quote.plan }} />
      {/* Hidden while a form panel is open, so the launcher can't sit on top of its submit button. */}
      {!demoOpen && !quote.open && <ContactWidget open={contactOpen} onOpenChange={setContactOpen} />}
    </LeadCaptureContext.Provider>
  );
}

export function useLeadCapture() {
  const ctx = useContext(LeadCaptureContext);
  if (!ctx) throw new Error("useLeadCapture must be used inside <LeadCaptureProvider>");
  return ctx;
}
