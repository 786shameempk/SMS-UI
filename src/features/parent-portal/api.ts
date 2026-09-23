import { engagementHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { listClasses, listSubjects } from "@/features/academics/api";
import { listAttendanceRecords } from "@/features/attendance/api";
import { getExamResults, listExamSchedules, listExams } from "@/features/examinations/api";
import { listAssignedHomework } from "@/features/homework/api";
import { getStudent, listStudents } from "@/features/students/api";
import type { Student } from "@/features/students/types";
import { listInvoicesForStudent, payInvoiceOnline } from "@/features/fees/api";
import type { FeeInvoice as FeesInvoice } from "@/features/fees/types";
import { listMyNotifications, markRead } from "@/features/notifications/api";
import type { Notification } from "@/features/notifications/types";
import type {
  AttendanceDay,
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

/** A parent's children are the students listing them (by email) as a guardian. */
export async function getMyChildren(parentEmail: string): Promise<Student[]> {
  const email = parentEmail.trim().toLowerCase();
  const all = await listStudents();
  return all.filter((s) => s.guardians.some((g) => g.email?.trim().toLowerCase() === email));
}

// ── Composed from other modules (AcademicService) ─────────────────────────

const ATTENDANCE_WINDOW_DAYS = 90;
const ATTENDANCE_RECENT_DAYS = 14;

export async function getAttendanceSummary(studentId: string): Promise<AttendanceSummary> {
  const from = new Date();
  from.setDate(from.getDate() - ATTENDANCE_WINDOW_DAYS);
  const records = (await listAttendanceRecords({ dateFrom: from.toISOString().slice(0, 10) }))
    .filter((r) => r.studentId === studentId)
    .sort((a, b) => a.date.localeCompare(b.date));

  // Half-days count as present and approved leave as absent for the parent-facing summary.
  const days: AttendanceDay[] = records.map((r) => ({
    date: r.date,
    status: r.status === "late" ? "late" : r.status === "present" || r.status === "half-day" ? "present" : "absent",
  }));

  return {
    studentId,
    presentDays: days.filter((d) => d.status === "present").length,
    absentDays: days.filter((d) => d.status === "absent").length,
    lateDays: days.filter((d) => d.status === "late").length,
    totalDays: days.length,
    recent: days.slice(-ATTENDANCE_RECENT_DAYS),
  };
}

export async function listHomework(studentId: string): Promise<HomeworkItem[]> {
  const [rows, subjects] = await Promise.all([listAssignedHomework(studentId), listSubjects()]);
  const subjectName = new Map(subjects.map((s) => [s.id, s.name] as const));
  const today = new Date().toISOString().slice(0, 10);

  return rows.map(({ homework, submission }) => {
    let status: HomeworkItem["status"];
    if (submission.status === "graded") status = "graded";
    else if (submission.status === "submitted") status = "submitted";
    else status = homework.dueDate < today ? "overdue" : "pending";
    return {
      id: homework.id,
      studentId,
      subject: subjectName.get(homework.subjectId) ?? "—",
      title: homework.title,
      assignedDate: homework.assignedDate,
      dueDate: homework.dueDate,
      status,
      grade: submission.grade !== undefined ? String(submission.grade) : undefined,
    };
  });
}

export async function listExamResults(studentId: string): Promise<ExamResult[]> {
  const student = await getStudent(studentId);
  const [exams, subjects, schedules, classes] = await Promise.all([listExams(), listSubjects(), listExamSchedules(), listClasses()]);
  // Student carries its class by name (see students/api.ts mapStudent), so match on that.
  const classId = classes.find((c) => c.name === student.className)?.id;
  const classExams = exams.filter((e) => e.classId === classId);
  const subjectName = new Map(subjects.map((s) => [s.id, s.name] as const));
  const scheduleDate = new Map(schedules.map((s) => [`${s.examId}:${s.subjectId}`, s.date] as const));

  const results = (await Promise.all(classExams.map((e) => getExamResults(e.id)))).flat();
  const examById = new Map(classExams.map((e) => [e.id, e] as const));

  return results
    .filter((r) => r.studentId === studentId && !r.isAbsent)
    .map((r) => {
      const exam = examById.get(r.examId);
      return {
        id: r.id,
        studentId,
        examName: exam?.name ?? "—",
        subject: subjectName.get(r.subjectId) ?? "—",
        date: scheduleDate.get(`${r.examId}:${r.subjectId}`) ?? exam?.startDate ?? "",
        marksObtained: r.marksObtained,
        maxMarks: r.maxMarks,
        grade: r.grade,
      };
    })
    .sort((x, y) => y.date.localeCompare(x.date));
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
