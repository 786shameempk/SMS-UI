import { authHttpClient, extractApiErrorMessage, getApiErrorStatus } from "@/lib/httpClient";

export type LeadKind = "contact" | "demo";

export interface ContactLead {
  kind: "contact";
  name: string;
  /** At least one of phone/email is always present - the widget requires one or the other. */
  phone?: string;
  email?: string;
  message: string;
}

export interface DemoLead {
  kind: "demo";
  name: string;
  email: string;
  phone: string;
  schoolName: string;
  studentCount: string;
  preferredDate?: string;
  message?: string;
}

export type Lead = ContactLead | DemoLead;

const LEAD_KIND_TO_API: Record<LeadKind, string> = { contact: "Contact", demo: "Demo" };

/**
 * Landing-page leads (Contact Us chat + Request a Demo), sent to AuthService's public `POST /api/leads`.
 * The backend emails the company inbox and, when a phone number is given, WhatsApps the company number
 * (see AuthService's LeadNotifications settings). It's rate-limited per IP.
 */
export async function submitLead(lead: Lead): Promise<void> {
  try {
    await authHttpClient.post("/api/leads", {
      ...lead,
      kind: LEAD_KIND_TO_API[lead.kind],
      phone: lead.phone || null,
      email: lead.email || null,
    });
  } catch (err) {
    if (getApiErrorStatus(err) === 429) {
      throw new Error("You've sent a few messages already — please wait a minute and try again.");
    }
    throw new Error(extractApiErrorMessage(err, "We couldn't send your request. Please try again in a moment."));
  }
}
