import { mockDelay } from "@/utils/mockDelay";
import { DEFAULT_TENANT_ID, getCurrentTenantId, migrateLegacyRecordsToDefaultTenant, scopedToCurrentTenant } from "@/utils/tenant";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { listInvoicesForStudent, payInvoiceOnline } from "@/features/fees/api";
import type { FeeInvoice as FeesInvoice } from "@/features/fees/types";
import { PARENT_CHILDREN_MAP } from "./constants";
import {
  buildAttendanceSummary,
  buildExamResults,
  buildHomework,
  buildLeaveRequests,
  buildMessageThreads,
  buildNotifications,
} from "./mock";
import type {
  AttendanceSummary,
  ExamResult,
  FeeInvoice,
  HomeworkItem,
  LeaveRequest,
  LeaveRequestFormValues,
  MessageThread,
  ParentNotification,
} from "./types";

const THREADS_KEY = "sms-mock-parent-threads";
const LEAVE_KEY = "sms-mock-parent-leave";
const NOTIFICATIONS_KEY = "sms-mock-parent-notifications";

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

// threadsByStudent/leaveByStudent are keyed by studentId, not tagged with tenantId directly —
// like RolePermissionMap in administration/roles, they're only ever reached via a studentId
// that already passed through a tenant-scoped lookup (getMyChildren -> listStudents), so an
// opaque, tenant-unreachable key keeps them safe without a parallel tenantId field.
let threadsByStudent = loadJson<Record<string, MessageThread[]>>(THREADS_KEY, {});
let leaveByStudent = loadJson<Record<string, LeaveRequest[]>>(LEAVE_KEY, {});
let notifications = migrateLegacyRecordsToDefaultTenant(
  loadJson<ParentNotification[]>(NOTIFICATIONS_KEY, buildNotifications().map((n) => ({ ...n, tenantId: DEFAULT_TENANT_ID }))),
);

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

function ensureThreads(studentId: string, teacherName: string): MessageThread[] {
  if (!threadsByStudent[studentId]) {
    threadsByStudent = { ...threadsByStudent, [studentId]: buildMessageThreads(studentId, teacherName) };
    saveJson(THREADS_KEY, threadsByStudent);
  }
  return threadsByStudent[studentId];
}

function ensureLeave(studentId: string): LeaveRequest[] {
  if (!leaveByStudent[studentId]) {
    leaveByStudent = { ...leaveByStudent, [studentId]: buildLeaveRequests(studentId) };
    saveJson(LEAVE_KEY, leaveByStudent);
  }
  return leaveByStudent[studentId];
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

export async function listMessageThreads(studentId: string, teacherName: string): Promise<MessageThread[]> {
  return mockDelay([...ensureThreads(studentId, teacherName)], 350);
}

export async function sendMessage(studentId: string, threadId: string, body: string): Promise<MessageThread> {
  const threads = ensureThreads(studentId, "Teacher");
  const idx = threads.findIndex((t) => t.id === threadId);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("Thread not found");
  }
  const updated: MessageThread = {
    ...threads[idx],
    messages: [
      ...threads[idx].messages,
      { id: `msg-${Math.random().toString(36).slice(2, 8)}`, sender: "parent", body, sentAt: new Date().toISOString() },
    ],
  };
  const nextList = threads.map((t) => (t.id === threadId ? updated : t));
  threadsByStudent = { ...threadsByStudent, [studentId]: nextList };
  saveJson(THREADS_KEY, threadsByStudent);
  return mockDelay(updated, 400);
}

export async function listLeaveRequests(studentId: string): Promise<LeaveRequest[]> {
  return mockDelay([...ensureLeave(studentId)], 350);
}

export async function createLeaveRequest(studentId: string, values: LeaveRequestFormValues): Promise<LeaveRequest> {
  const requests = ensureLeave(studentId);
  const request: LeaveRequest = {
    id: `${studentId}-leave-${Math.random().toString(36).slice(2, 8)}`,
    studentId,
    ...values,
    status: "pending",
    requestedAt: new Date().toISOString(),
  };
  const nextList = [request, ...requests];
  leaveByStudent = { ...leaveByStudent, [studentId]: nextList };
  saveJson(LEAVE_KEY, leaveByStudent);
  return mockDelay(request, 450);
}

export async function listNotifications(): Promise<ParentNotification[]> {
  return mockDelay(scopedToCurrentTenant(notifications), 300);
}

export async function markNotificationRead(id: string): Promise<ParentNotification[]> {
  const tenantId = getCurrentTenantId();
  notifications = notifications.map((n) => (n.id === id && n.tenantId === tenantId ? { ...n, read: true } : n));
  saveJson(NOTIFICATIONS_KEY, notifications);
  return mockDelay(scopedToCurrentTenant(notifications), 150);
}
