export type AttendanceDayStatus = "present" | "absent" | "late" | "holiday";

export interface AttendanceDay {
  date: string;
  status: AttendanceDayStatus;
}

export interface AttendanceSummary {
  studentId: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  totalDays: number;
  recent: AttendanceDay[];
}

export type HomeworkStatus = "pending" | "submitted" | "graded" | "overdue";

export interface HomeworkItem {
  id: string;
  studentId: string;
  subject: string;
  title: string;
  assignedDate: string;
  dueDate: string;
  status: HomeworkStatus;
  grade?: string;
}

export interface ExamResult {
  id: string;
  studentId: string;
  examName: string;
  subject: string;
  date: string;
  marksObtained: number;
  maxMarks: number;
  grade: string;
}

export type FeeInvoiceStatus = "paid" | "due" | "overdue" | "partial";

/**
 * Backed by the real Fee Management module (src/features/fees) — see api.ts's
 * listFeeInvoices/payFeeInvoice, which adapt src/features/fees FeeInvoice records into this
 * shape. `amount` reflects the net payable amount (after discounts/fines), not the raw
 * fee-structure amount.
 */
export interface FeeInvoice {
  id: string;
  studentId: string;
  term: string;
  amount: number;
  dueDate: string;
  status: FeeInvoiceStatus;
  paidOn?: string;
  paidAmount?: number;
}

export interface ThreadMessage {
  id: string;
  sender: "parent" | "teacher";
  body: string;
  sentAt: string;
}

export interface MessageThread {
  id: string;
  studentId: string;
  teacherName: string;
  subject: string;
  messages: ThreadMessage[];
}

export type LeaveRequestStatus = "pending" | "approved" | "rejected";

export interface LeaveRequest {
  id: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: LeaveRequestStatus;
  requestedAt: string;
}

export interface LeaveRequestFormValues {
  fromDate: string;
  toDate: string;
  reason: string;
}

export interface ParentNotification {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  studentId?: string;
}
