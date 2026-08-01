import { mockDelay } from "@/utils/mockDelay";
import { listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { PARENT_CHILDREN_MAP } from "./constants";
import {
  buildAttendanceSummary,
  buildExamResults,
  buildFeeInvoices,
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

const FEES_KEY = "sms-mock-parent-fees";
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

let feesByStudent = loadJson<Record<string, FeeInvoice[]>>(FEES_KEY, {});
let threadsByStudent = loadJson<Record<string, MessageThread[]>>(THREADS_KEY, {});
let leaveByStudent = loadJson<Record<string, LeaveRequest[]>>(LEAVE_KEY, {});
let notifications = loadJson<ParentNotification[]>(NOTIFICATIONS_KEY, buildNotifications());

function ensureFees(studentId: string): FeeInvoice[] {
  if (!feesByStudent[studentId]) {
    feesByStudent = { ...feesByStudent, [studentId]: buildFeeInvoices(studentId) };
    saveJson(FEES_KEY, feesByStudent);
  }
  return feesByStudent[studentId];
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
  return mockDelay([...ensureFees(studentId)], 350);
}

export async function payFeeInvoice(studentId: string, invoiceId: string): Promise<FeeInvoice> {
  const invoices = ensureFees(studentId);
  const idx = invoices.findIndex((f) => f.id === invoiceId);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("Invoice not found");
  }
  const updated: FeeInvoice = { ...invoices[idx], status: "paid", paidOn: new Date().toISOString() };
  const nextList = invoices.map((f) => (f.id === invoiceId ? updated : f));
  feesByStudent = { ...feesByStudent, [studentId]: nextList };
  saveJson(FEES_KEY, feesByStudent);
  return mockDelay(updated, 900);
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
  return mockDelay([...notifications], 300);
}

export async function markNotificationRead(id: string): Promise<ParentNotification[]> {
  notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
  saveJson(NOTIFICATIONS_KEY, notifications);
  return mockDelay([...notifications], 150);
}
