import { mockDelay } from "@/utils/mockDelay";
import { engagementHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { listInvoicesForStudent, payInvoiceOnline } from "@/features/fees/api";
import type { FeeInvoice as FeesInvoice } from "@/features/fees/types";
import { listMyNotifications, markRead } from "@/features/notifications/api";
import type { Notification } from "@/features/notifications/types";
import { PARENT_CHILDREN_MAP } from "./constants";
import { buildAttendanceSummary, buildExamResults, buildHomework } from "./mock";
import type {
  AttendanceSummary,
  ExamResult,
  FeeInvoice,
  HomeworkItem,
  LeaveRequest,
  LeaveRequestFormValues,
  LeaveRequestStatus,
  MessageThread,
  ParentNotification,
  ThreadMessage,
} from "./types";

// ── Owned slice (EngagementService) ─────────────────────────────────────────
// Message threads and leave requests are Parent Portal's own data, served by EngagementService.
// Its notifications are the real inbox (features/notifications), not a separate mock list.

const SENDER_FROM_API: Record<string, ThreadMessage["sender"]> = { Parent: "parent", Teacher: "teacher" };
const LEAVE_STATUS_FROM_API: Record<string, LeaveRequestStatus> = { Pending: "pending", Approved: "approved", Rejected: "rejected" };

interface ApiThread {
  id: string;
  studentId: string;
  teacherName: string;
  subject: string;
  messages: Array<{ id: string; sender: string; body: string; sentAt: string }>;
}

interface ApiLeaveRequest {
  id: string;
  studentId: string;
  fromDate: string;
  toDate: string;
  reason: string;
  status: string;
  requestedAt: string;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

function mapThread(t: ApiThread): MessageThread {
  return {
    id: t.id,
    studentId: t.studentId,
    teacherName: t.teacherName,
    subject: t.subject,
    messages: t.messages.map((m) => ({ id: m.id, sender: SENDER_FROM_API[m.sender], body: m.body, sentAt: m.sentAt })),
  };
}

function mapLeaveRequest(r: ApiLeaveRequest): LeaveRequest {
  return { ...r, status: LEAVE_STATUS_FROM_API[r.status] };
}

function toParentNotification(n: Notification): ParentNotification {
  return { id: n.id, tenantId: n.tenantId, title: n.title, body: n.body, createdAt: n.createdAt, read: n.read };
}

function toParentFeeInvoice(invoice: FeesInvoice): FeeInvoice {
  return {
    id: invoice.id,
    studentId: invoice.studentId,
    term: invoice.term,
    amount: invoice.netAmount,
    dueDate: invoice.dueDate,
    status: invoice.status,
    paidOn: invoice.paidOn,
    paidAmount: invoice.paidAmount,
  };
}

export async function getMyChildren(parentEmail: string): Promise<Student[]> {
  const ids = PARENT_CHILDREN_MAP[parentEmail.toLowerCase()] ?? [];
  const all = await listStudents();
  return all.filter((s) => ids.includes(s.id));
}

export async function getAttendanceSummary(studentId: string): Promise<AttendanceSummary> {
  return mockDelay(buildAttendanceSummary(studentId), 350);
}

export async function listHomework(studentId: string): Promise<HomeworkItem[]> {
  return mockDelay(buildHomework(studentId), 350);
}

export async function listExamResults(studentId: string): Promise<ExamResult[]> {
  return mockDelay(buildExamResults(studentId), 350);
}

export async function listFeeInvoices(studentId: string): Promise<FeeInvoice[]> {
  const invoices = await listInvoicesForStudent(studentId);
  return invoices.map(toParentFeeInvoice);
}

export async function payFeeInvoice(studentId: string, invoiceId: string): Promise<FeeInvoice> {
  void studentId;
  const { invoice } = await payInvoiceOnline(invoiceId);
  return toParentFeeInvoice(invoice);
}

/**
 * The mock seeded a demo "Progress check-in" thread with made-up teacher messages per child.
 * With real data, a child with no thread yet gets one empty "General" thread with their class
 * teacher instead, so the parent always has somewhere to write (MessagesTab has no "new thread").
 */
export async function listMessageThreads(studentId: string, teacherName: string): Promise<MessageThread[]> {
  const threads = await unwrap(engagementHttpClient.get<ApiThread[]>("api/ParentMessageThreads", { params: { studentId } }));
  if (threads.length > 0) return threads.map(mapThread);
  const started = await unwrap(
    engagementHttpClient.post<ApiThread>("api/ParentMessageThreads", { studentId, teacherName, subject: "General" }),
  );
  return [mapThread(started)];
}

export async function sendMessage(studentId: string, threadId: string, body: string): Promise<MessageThread> {
  void studentId;
  return mapThread(
    await unwrap(engagementHttpClient.post<ApiThread>(`api/ParentMessageThreads/${threadId}/messages`, { sender: "Parent", body })),
  );
}

export async function listLeaveRequests(studentId: string): Promise<LeaveRequest[]> {
  const requests = await unwrap(engagementHttpClient.get<ApiLeaveRequest[]>("api/StudentLeaveRequests", { params: { studentId } }));
  return requests.map(mapLeaveRequest);
}

export async function createLeaveRequest(studentId: string, values: LeaveRequestFormValues): Promise<LeaveRequest> {
  return mapLeaveRequest(
    await unwrap(engagementHttpClient.post<ApiLeaveRequest>("api/StudentLeaveRequests", { studentId, ...values })),
  );
}

export async function listNotifications(): Promise<ParentNotification[]> {
  return (await listMyNotifications()).map(toParentNotification);
}

export async function markNotificationRead(id: string): Promise<ParentNotification[]> {
  await markRead(id);
  return listNotifications();
}
