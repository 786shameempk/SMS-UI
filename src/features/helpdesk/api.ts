import { mockDelay } from "@/utils/mockDelay";
import { createStaff, listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { isOverdue, nextTicketNumber } from "./constants";
import { buildSeedTickets, EXTRA_IT_SUPPORT_SEEDS } from "./mock";
import type {
  AddCommentFormValues,
  HelpDeskReportsSummary,
  RaiseTicketFormValues,
  ResolveTicketFormValues,
  Ticket,
  TicketCategory,
  TicketComment,
  TicketPriority,
  TicketRow,
  TicketStatus,
} from "./types";

const TICKETS_KEY = "sms-mock-helpdesk-tickets";
const SEEDED_KEY = "sms-mock-helpdesk-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function requireTicket(id: string): Ticket {
  const found = tickets.find((t) => t.id === id);
  if (!found) throw new Error("Ticket not found");
  return found;
}

let tickets = loadJson<Ticket[]>(TICKETS_KEY, []);

function persistTickets() {
  saveJson(TICKETS_KEY, tickets);
}

/**
 * IT Support is already a valid StaffDesignation but the generic seed ships no one holding
 * it — created via the real createStaff() on first load, same convention as Health's Nurse
 * and Hostel's Warden. Tickets are this module's own data; students/staff are only ever read
 * to resolve who raised/is assigned a ticket, never duplicated.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  const existingStaff = await listStaff();
  const staffIdByEmail = new Map(existingStaff.map((s) => [s.email.toLowerCase(), s.id] as const));
  const toCreate = EXTRA_IT_SUPPORT_SEEDS.filter((s) => !staffIdByEmail.has(s.email.toLowerCase()));
  await Promise.all(toCreate.map((values) => createStaff(values)));

  if (tickets.length === 0) {
    const [students, staff] = await Promise.all([listStudents(), listStaff()]);
    tickets = buildSeedTickets(students, staff);
    persistTickets();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Help Desk seed failed", err);
});

async function joinContext(): Promise<{ studentById: Map<string, Student>; staffById: Map<string, StaffMember> }> {
  const [students, staff] = await Promise.all([listStudents(), listStaff()]);
  return {
    studentById: new Map(students.map((s) => [s.id, s] as const)),
    staffById: new Map(staff.map((s) => [s.id, s] as const)),
  };
}

function raisedByLabel(ticket: Ticket, studentById: Map<string, Student>, staffById: Map<string, StaffMember>): string {
  if (ticket.raisedByType === "student") {
    const s = ticket.raisedByStudentId ? studentById.get(ticket.raisedByStudentId) : undefined;
    return s ? `${s.firstName} ${s.lastName} (${s.className} - ${s.section})` : "Unknown student";
  }
  if (ticket.raisedByType === "staff") {
    const s = ticket.raisedByStaffId ? staffById.get(ticket.raisedByStaffId) : undefined;
    return s ? `${s.firstName} ${s.lastName} (${s.designation})` : "Unknown staff";
  }
  if (ticket.raisedByType === "parent") {
    const child = ticket.raisedByStudentId ? studentById.get(ticket.raisedByStudentId) : undefined;
    const base = ticket.raisedByName?.trim() || "Parent/Guardian";
    return child ? `${base} (parent of ${child.firstName} ${child.lastName})` : base;
  }
  return "Anonymous";
}

function toRow(ticket: Ticket, studentById: Map<string, Student>, staffById: Map<string, StaffMember>): TicketRow {
  return {
    ...ticket,
    raisedByStudent: ticket.raisedByStudentId ? studentById.get(ticket.raisedByStudentId) : undefined,
    raisedByStaff: ticket.raisedByStaffId ? staffById.get(ticket.raisedByStaffId) : undefined,
    raisedByLabel: raisedByLabel(ticket, studentById, staffById),
    assignedTo: ticket.assignedToStaffId ? staffById.get(ticket.assignedToStaffId) : undefined,
    isOverdue: isOverdue(ticket),
  };
}

export async function listTickets(filters?: { status?: TicketStatus; category?: TicketCategory; priority?: TicketPriority }): Promise<TicketRow[]> {
  await seedPromise;
  const { studentById, staffById } = await joinContext();
  const rows = tickets
    .filter((t) => !filters?.status || t.status === filters.status)
    .filter((t) => !filters?.category || t.category === filters.category)
    .filter((t) => !filters?.priority || t.priority === filters.priority)
    .map((t) => toRow(t, studentById, staffById))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return mockDelay(rows, 350);
}

export async function getTicket(id: string): Promise<TicketRow> {
  await seedPromise;
  const { studentById, staffById } = await joinContext();
  return mockDelay(toRow(requireTicket(id), studentById, staffById), 300);
}

export async function raiseTicket(values: RaiseTicketFormValues): Promise<Ticket> {
  await seedPromise;
  const now = new Date().toISOString();
  const ticket: Ticket = {
    id: genId("ticket"),
    ticketNumber: nextTicketNumber(tickets.map((t) => t.ticketNumber)),
    category: values.category,
    priority: values.priority,
    status: "open",
    subject: values.subject,
    description: values.description,
    raisedByType: values.raisedByType,
    raisedByStudentId: values.raisedByStudentId,
    raisedByStaffId: values.raisedByStaffId,
    raisedByName: values.raisedByName,
    raisedByContact: values.raisedByContact,
    createdAt: now,
    updatedAt: now,
    comments: [],
  };
  tickets = [ticket, ...tickets];
  persistTickets();
  return mockDelay(ticket, 400);
}

export async function assignTicket(id: string, staffId: string): Promise<Ticket> {
  await seedPromise;
  const ticket = requireTicket(id);
  const updated: Ticket = {
    ...ticket,
    assignedToStaffId: staffId,
    status: ticket.status === "open" ? "in_progress" : ticket.status,
    updatedAt: new Date().toISOString(),
  };
  tickets = tickets.map((t) => (t.id === id ? updated : t));
  persistTickets();
  return mockDelay(updated, 350);
}

export async function resolveTicket(id: string, values: ResolveTicketFormValues): Promise<Ticket> {
  await seedPromise;
  const ticket = requireTicket(id);
  if (ticket.status === "resolved" || ticket.status === "closed") throw new Error("This ticket is already resolved");
  const now = new Date().toISOString();
  const updated: Ticket = { ...ticket, status: "resolved", resolvedAt: now, resolutionNotes: values.resolutionNotes, updatedAt: now };
  tickets = tickets.map((t) => (t.id === id ? updated : t));
  persistTickets();
  return mockDelay(updated, 350);
}

export async function closeTicket(id: string): Promise<Ticket> {
  await seedPromise;
  const ticket = requireTicket(id);
  if (ticket.status !== "resolved") throw new Error("Only a resolved ticket can be closed");
  const updated: Ticket = { ...ticket, status: "closed", updatedAt: new Date().toISOString() };
  tickets = tickets.map((t) => (t.id === id ? updated : t));
  persistTickets();
  return mockDelay(updated, 300);
}

export async function reopenTicket(id: string): Promise<Ticket> {
  await seedPromise;
  const ticket = requireTicket(id);
  if (ticket.status !== "resolved" && ticket.status !== "closed") throw new Error("Only a resolved or closed ticket can be reopened");
  const updated: Ticket = { ...ticket, status: "reopened", resolvedAt: undefined, updatedAt: new Date().toISOString() };
  tickets = tickets.map((t) => (t.id === id ? updated : t));
  persistTickets();
  return mockDelay(updated, 300);
}

export async function addComment(id: string, values: AddCommentFormValues): Promise<Ticket> {
  await seedPromise;
  const ticket = requireTicket(id);
  const staff = values.authorStaffId ? (await listStaff()).find((s) => s.id === values.authorStaffId) : undefined;
  const comment: TicketComment = {
    id: genId("comment"),
    message: values.message,
    authorStaffId: values.authorStaffId,
    authorLabel: staff ? `${staff.firstName} ${staff.lastName}` : "Front desk",
    createdAt: new Date().toISOString(),
    visibleToSubmitter: values.visibleToSubmitter,
  };
  const updated: Ticket = { ...ticket, comments: [...ticket.comments, comment], updatedAt: comment.createdAt };
  tickets = tickets.map((t) => (t.id === id ? updated : t));
  persistTickets();
  return mockDelay(updated, 350);
}

export async function deleteTicket(id: string): Promise<void> {
  await seedPromise;
  requireTicket(id);
  tickets = tickets.filter((t) => t.id !== id);
  persistTickets();
  return mockDelay(undefined, 300);
}

export async function getHelpDeskReportsSummary(): Promise<HelpDeskReportsSummary> {
  await seedPromise;
  const openCount = tickets.filter((t) => t.status === "open").length;
  const inProgressCount = tickets.filter((t) => t.status === "in_progress" || t.status === "reopened").length;

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const resolvedThisMonth = tickets.filter((t) => t.resolvedAt && new Date(t.resolvedAt).getTime() >= monthStart.getTime()).length;

  const resolvedTickets = tickets.filter((t) => t.resolvedAt);
  const avgResolutionHours =
    resolvedTickets.length === 0
      ? null
      : Math.round(
          (resolvedTickets.reduce((sum, t) => sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0) / resolvedTickets.length) / (60 * 60 * 1000),
        );

  const categoryCounts = new Map<string, number>();
  for (const t of tickets) categoryCounts.set(t.category, (categoryCounts.get(t.category) ?? 0) + 1);
  const byCategory = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category: category as TicketCategory, count }))
    .sort((a, b) => b.count - a.count);

  const priorityCounts = new Map<string, number>();
  for (const t of tickets) priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
  const byPriority = Array.from(priorityCounts.entries()).map(([priority, count]) => ({ priority: priority as TicketPriority, count }));

  const { studentById, staffById } = await joinContext();
  const overdueTickets = tickets.filter((t) => isOverdue(t)).map((t) => toRow(t, studentById, staffById));

  return mockDelay({ openCount, inProgressCount, resolvedThisMonth, avgResolutionHours, byCategory, byPriority, overdueTickets }, 350);
}
