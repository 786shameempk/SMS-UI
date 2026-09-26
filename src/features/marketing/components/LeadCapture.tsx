import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import ContactWidget from "./ContactWidget";
import RequestDemoDialog from "./RequestDemoDialog";

interface LeadCaptureContextValue {
  openDemo: () => void;
  openContact: () => void;
}

const LeadCaptureContext = createContext<LeadCaptureContextValue | null>(null);

/** Hosts the landing page's "Request a Demo" dialog and floating "Contact Us" chat widget, so any CTA can open them. */
export function LeadCaptureProvider({ children }: { children: ReactNode }) {
  const [demoOpen, setDemoOpen] = useState(false);
  const [contactOpen, setContactOpen] = useState(false);

  const value = useMemo(
    () => ({
      openDemo: () => {
        setContactOpen(false);
        setDemoOpen(true);
      },
      openContact: () => setContactOpen(true),
    }),
    [],
  );

  return (
    <LeadCaptureContext.Provider value={value}>
      {children}
      <RequestDemoDialog open={demoOpen} onOpenChange={setDemoOpen} />
      {/* Hidden while the demo panel is open, so the launcher can't sit on top of its submit button. */}
      {!demoOpen && <ContactWidget open={contactOpen} onOpenChange={setContactOpen} />}
    </LeadCaptureContext.Provider>
  );
}

export function useLeadCapture() {
  const ctx = useContext(LeadCaptureContext);
  if (!ctx) throw new Error("useLeadCapture must be used inside <LeadCaptureProvider>");
  return ctx;
}
