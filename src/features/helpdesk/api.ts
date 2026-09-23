import { campusHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStaff } from "@/features/staff/api";
import type { StaffMember } from "@/features/staff/types";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { isOverdue } from "./constants";
import type {
  AddCommentFormValues,
  HelpDeskReportsSummary,
  RaisedByType,
  RaiseTicketFormValues,
  ResolveTicketFormValues,
  Ticket,
  TicketCategory,
  TicketPriority,
  TicketRow,
  TicketStatus,
} from "./types";

// ── Enum translation ────────────────────────────────────────────────────────
// CampusService's enums serialize as PascalCase (C# convention); SMS UI's types use
// lowercase/snake_case unions - see docs/MICROSERVICES_PLAN.md's enum-translation note.

const CATEGORY_TO_API: Record<TicketCategory, string> = {
  academic: "Academic",
  facilities: "Facilities",
  transport: "Transport",
  hostel: "Hostel",
  discipline: "Discipline",
  it_support: "ItSupport",
  fees_billing: "FeesBilling",
  other: "Other",
};
const CATEGORY_FROM_API: Record<string, TicketCategory> = Object.fromEntries(
  Object.entries(CATEGORY_TO_API).map(([key, value]) => [value, key as TicketCategory]),
);

const PRIORITY_TO_API: Record<TicketPriority, string> = { low: "Low", medium: "Medium", high: "High", urgent: "Urgent" };
const PRIORITY_FROM_API: Record<string, TicketPriority> = { Low: "low", Medium: "medium", High: "high", Urgent: "urgent" };

const STATUS_TO_API: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "InProgress",
  resolved: "Resolved",
  closed: "Closed",
  reopened: "Reopened",
};
const STATUS_FROM_API: Record<string, TicketStatus> = {
  Open: "open",
  InProgress: "in_progress",
  Resolved: "resolved",
  Closed: "closed",
  Reopened: "reopened",
};

const RAISED_BY_TO_API: Record<RaisedByType, string> = { student: "Student", staff: "Staff", parent: "Parent", anonymous: "Anonymous" };
const RAISED_BY_FROM_API: Record<string, RaisedByType> = { Student: "student", Staff: "staff", Parent: "parent", Anonymous: "anonymous" };

// ── API response shapes (CampusService DTOs) ────────────────────────────────

interface ApiTicketComment {
  id: string;
  message: string;
  authorStaffId: string | null;
  authorLabel: string;
  createdAt: string;
  visibleToSubmitter: boolean;
}

interface ApiTicket {
  id: string;
  tenantId: string;
  branchId: string;
  ticketNumber: string;
  category: string;
  priority: string;
  status: string;
  subject: string;
  description: string;
  raisedByType: string;
  raisedByStudentId: string | null;
  raisedByStaffId: string | null;
  raisedByName: string | null;
  raisedByContact: string | null;
  assignedToStaffId: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  comments: ApiTicketComment[];
}

function mapTicket(dto: ApiTicket): Ticket {
  return {
    id: dto.id,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
    ticketNumber: dto.ticketNumber,
    category: CATEGORY_FROM_API[dto.category] ?? "other",
    priority: PRIORITY_FROM_API[dto.priority] ?? "medium",
    status: STATUS_FROM_API[dto.status] ?? "open",
    subject: dto.subject,
    description: dto.description,
    raisedByType: RAISED_BY_FROM_API[dto.raisedByType] ?? "anonymous",
    raisedByStudentId: dto.raisedByStudentId ?? undefined,
    raisedByStaffId: dto.raisedByStaffId ?? undefined,
    raisedByName: dto.raisedByName ?? undefined,
    raisedByContact: dto.raisedByContact ?? undefined,
    assignedToStaffId: dto.assignedToStaffId ?? undefined,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
    resolvedAt: dto.resolvedAt ?? undefined,
    resolutionNotes: dto.resolutionNotes ?? undefined,
    comments: dto.comments.map((c) => ({
      id: c.id,
      message: c.message,
      authorStaffId: c.authorStaffId ?? undefined,
      authorLabel: c.authorLabel,
      createdAt: c.createdAt,
      visibleToSubmitter: c.visibleToSubmitter,
    })),
  };
}

function blankToNull(value?: string): string | null {
  return value?.trim() ? value.trim() : null;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

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

/** SLA/overdue is computed against the viewer's clock, never stored (docs/MICROSERVICES_PLAN.md). */
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

async function fetchTickets(filters?: { status?: TicketStatus; category?: TicketCategory; priority?: TicketPriority }): Promise<Ticket[]> {
  const tickets = await unwrap(
    campusHttpClient.get<ApiTicket[]>("/api/tickets", {
      params: {
        status: filters?.status ? STATUS_TO_API[filters.status] : undefined,
        category: filters?.category ? CATEGORY_TO_API[filters.category] : undefined,
        priority: filters?.priority ? PRIORITY_TO_API[filters.priority] : undefined,
      },
    }),
  );
  return tickets.map(mapTicket);
}

export async function listTickets(filters?: { status?: TicketStatus; category?: TicketCategory; priority?: TicketPriority }): Promise<TicketRow[]> {
  const [tickets, { studentById, staffById }] = await Promise.all([fetchTickets(filters), joinContext()]);
  return tickets.map((t) => toRow(t, studentById, staffById));
}

export async function getTicket(id: string): Promise<TicketRow> {
  const [dto, { studentById, staffById }] = await Promise.all([unwrap(campusHttpClient.get<ApiTicket>(`/api/tickets/${id}`)), joinContext()]);
  return toRow(mapTicket(dto), studentById, staffById);
}

export async function raiseTicket(values: RaiseTicketFormValues): Promise<Ticket> {
  // Only the raised-by fields matching raisedByType are sent, so a stale pick never leaks through
  // (a parent ticket may still name the child as raisedByStudentId, as the mock allows).
  const type = values.raisedByType;
  const dto = await unwrap(
    campusHttpClient.post<ApiTicket>("/api/tickets", {
      category: CATEGORY_TO_API[values.category],
      priority: PRIORITY_TO_API[values.priority],
      subject: values.subject,
      description: values.description,
      raisedByType: RAISED_BY_TO_API[type],
      raisedByStudentId: type === "student" || type === "parent" ? values.raisedByStudentId || null : null,
      raisedByStaffId: type === "staff" ? values.raisedByStaffId || null : null,
      raisedByName: type === "parent" ? blankToNull(values.raisedByName) : null,
      raisedByContact: type === "anonymous" ? null : blankToNull(values.raisedByContact),
    }),
  );
  return mapTicket(dto);
}

export async function assignTicket(id: string, staffId: string): Promise<Ticket> {
  return mapTicket(await unwrap(campusHttpClient.post<ApiTicket>(`/api/tickets/${id}/assign`, { staffId })));
}

export async function resolveTicket(id: string, values: ResolveTicketFormValues): Promise<Ticket> {
  return mapTicket(await unwrap(campusHttpClient.post<ApiTicket>(`/api/tickets/${id}/resolve`, { resolutionNotes: values.resolutionNotes })));
}

export async function closeTicket(id: string): Promise<Ticket> {
  return mapTicket(await unwrap(campusHttpClient.post<ApiTicket>(`/api/tickets/${id}/close`)));
}

export async function reopenTicket(id: string): Promise<Ticket> {
  return mapTicket(await unwrap(campusHttpClient.post<ApiTicket>(`/api/tickets/${id}/reopen`)));
}

/** The author label is resolved here from real staff data (CampusService only holds the soft staff id). */
export async function addComment(id: string, values: AddCommentFormValues): Promise<Ticket> {
  const staff = values.authorStaffId ? (await listStaff()).find((s) => s.id === values.authorStaffId) : undefined;
  const dto = await unwrap(
    campusHttpClient.post<ApiTicket>(`/api/tickets/${id}/comments`, {
      message: values.message,
      visibleToSubmitter: values.visibleToSubmitter,
      authorStaffId: values.authorStaffId || null,
      authorLabel: staff ? `${staff.firstName} ${staff.lastName}` : "Front desk",
    }),
  );
  return mapTicket(dto);
}

export async function deleteTicket(id: string): Promise<void> {
  await unwrap(campusHttpClient.delete(`/api/tickets/${id}`));
}

/** Composed client-side: "this month" and overdue are the viewer's local calendar/clock. */
export async function getHelpDeskReportsSummary(): Promise<HelpDeskReportsSummary> {
  const [tickets, { studentById, staffById }] = await Promise.all([fetchTickets(), joinContext()]);
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
          resolvedTickets.reduce((sum, t) => sum + (new Date(t.resolvedAt!).getTime() - new Date(t.createdAt).getTime()), 0) /
            resolvedTickets.length /
            (60 * 60 * 1000),
        );

  const categoryCounts = new Map<TicketCategory, number>();
  for (const t of tickets) categoryCounts.set(t.category, (categoryCounts.get(t.category) ?? 0) + 1);
  const byCategory = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);

  const priorityCounts = new Map<TicketPriority, number>();
  for (const t of tickets) priorityCounts.set(t.priority, (priorityCounts.get(t.priority) ?? 0) + 1);
  const byPriority = Array.from(priorityCounts.entries()).map(([priority, count]) => ({ priority, count }));

  const overdueTickets = tickets.filter((t) => isOverdue(t)).map((t) => toRow(t, studentById, staffById));

  return { openCount, inProgressCount, resolvedThisMonth, avgResolutionHours, byCategory, byPriority, overdueTickets };
}
