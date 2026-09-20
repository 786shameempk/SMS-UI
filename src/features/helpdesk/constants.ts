import type { Ticket, TicketCategory, TicketPriority, TicketStatus } from "./types";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info" | "neutral";

export const CATEGORY_CONFIG: Record<TicketCategory, { label: string }> = {
  academic: { label: "Academic" },
  facilities: { label: "Facilities" },
  transport: { label: "Transport" },
  hostel: { label: "Hostel" },
  discipline: { label: "Discipline / Conduct" },
  it_support: { label: "IT Support" },
  fees_billing: { label: "Fees & Billing" },
  other: { label: "Other" },
};

export const CATEGORY_OPTIONS: Array<{ value: TicketCategory; label: string }> = (Object.keys(CATEGORY_CONFIG) as TicketCategory[]).map((value) => ({
  value,
  label: CATEGORY_CONFIG[value].label,
}));

export const PRIORITY_CONFIG: Record<TicketPriority, { label: string; variant: BadgeVariant; slaHours: number }> = {
  urgent: { label: "Urgent", variant: "danger", slaHours: 4 },
  high: { label: "High", variant: "warning", slaHours: 24 },
  medium: { label: "Medium", variant: "info", slaHours: 72 },
  low: { label: "Low", variant: "neutral", slaHours: 120 },
};

export const PRIORITY_OPTIONS: Array<{ value: TicketPriority; label: string }> = (Object.keys(PRIORITY_CONFIG) as TicketPriority[]).map((value) => ({
  value,
  label: PRIORITY_CONFIG[value].label,
}));

export const STATUS_CONFIG: Record<TicketStatus, { label: string; variant: BadgeVariant }> = {
  open: { label: "Open", variant: "warning" },
  in_progress: { label: "In Progress", variant: "info" },
  resolved: { label: "Resolved", variant: "success" },
  closed: { label: "Closed", variant: "neutral" },
  reopened: { label: "Reopened", variant: "danger" },
};

export const RAISED_BY_TYPE_OPTIONS: Array<{ value: Ticket["raisedByType"]; label: string }> = [
  { value: "student", label: "A student" },
  { value: "parent", label: "A parent / guardian" },
  { value: "staff", label: "A staff member" },
  { value: "anonymous", label: "Anonymous" },
];

/** Open/in-progress/reopened tickets past their priority's SLA window since creation count as overdue. */
export function isOverdue(ticket: Pick<Ticket, "status" | "createdAt" | "priority">): boolean {
  if (ticket.status === "resolved" || ticket.status === "closed") return false;
  const slaMs = PRIORITY_CONFIG[ticket.priority].slaHours * 60 * 60 * 1000;
  return Date.now() - new Date(ticket.createdAt).getTime() > slaMs;
}

export function nextTicketNumber(existingNumbers: string[]): string {
  const year = new Date().getFullYear();
  const max = existingNumbers.reduce((acc, num) => {
    const match = num.match(/(\d+)$/);
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `HD-${year}-${String(max + 1).padStart(4, "0")}`;
}
