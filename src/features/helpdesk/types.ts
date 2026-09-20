import type { StaffMember } from "@/features/staff/types";
import type { Student } from "@/features/students/types";

export type TicketCategory = "academic" | "facilities" | "transport" | "hostel" | "discipline" | "it_support" | "fees_billing" | "other";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed" | "reopened";
export type RaisedByType = "student" | "staff" | "parent" | "anonymous";

export interface TicketComment {
  id: string;
  message: string;
  authorStaffId?: string;
  authorLabel: string;
  createdAt: string;
  visibleToSubmitter: boolean;
}

export interface RaisedByDetails {
  raisedByType: RaisedByType;
  raisedByStudentId?: string;
  raisedByStaffId?: string;
  raisedByName?: string;
  raisedByContact?: string;
}

export interface Ticket extends RaisedByDetails {
  id: string;
  ticketNumber: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  subject: string;
  description: string;
  assignedToStaffId?: string;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionNotes?: string;
  comments: TicketComment[];
}

export interface RaiseTicketFormValues extends RaisedByDetails {
  category: TicketCategory;
  priority: TicketPriority;
  subject: string;
  description: string;
}

export interface AddCommentFormValues {
  message: string;
  visibleToSubmitter: boolean;
  authorStaffId?: string;
}

export interface ResolveTicketFormValues {
  resolutionNotes: string;
}

export interface TicketRow extends Ticket {
  raisedByStudent?: Student;
  raisedByStaff?: StaffMember;
  raisedByLabel: string;
  assignedTo?: StaffMember;
  isOverdue: boolean;
}

export interface HelpDeskReportsSummary {
  openCount: number;
  inProgressCount: number;
  resolvedThisMonth: number;
  avgResolutionHours: number | null;
  byCategory: Array<{ category: TicketCategory; count: number }>;
  byPriority: Array<{ priority: TicketPriority; count: number }>;
  overdueTickets: TicketRow[];
}
