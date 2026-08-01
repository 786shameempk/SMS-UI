import type {
  AttendanceDay,
  AttendanceSummary,
  ExamResult,
  FeeInvoice,
  HomeworkItem,
  LeaveRequest,
  MessageThread,
  ParentNotification,
} from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

export function buildAttendanceSummary(studentId: string): AttendanceSummary {
  const recent: AttendanceDay[] = Array.from({ length: 14 }).map((_, i) => {
    const offset = 13 - i;
    const dayOfWeek = new Date(Date.now() - offset * DAY_MS).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) return { date: daysAgo(offset), status: "holiday" };
    const roll = (offset + studentId.length) % 11;
    const status = roll === 0 ? "absent" : roll === 5 ? "late" : "present";
    return { date: daysAgo(offset), status };
  });
  const present = recent.filter((d) => d.status === "present").length;
  const absent = recent.filter((d) => d.status === "absent").length;
  const late = recent.filter((d) => d.status === "late").length;
  const schoolDays = recent.filter((d) => d.status !== "holiday").length;
  return { studentId, presentDays: present, absentDays: absent, lateDays: late, totalDays: schoolDays, recent };
}

export function buildHomework(studentId: string): HomeworkItem[] {
  return [
    {
      id: `${studentId}-hw-1`,
      studentId,
      subject: "Mathematics",
      title: "Fractions worksheet 3",
      assignedDate: daysAgo(4),
      dueDate: daysFromNow(1),
      status: "pending",
    },
    {
      id: `${studentId}-hw-2`,
      studentId,
      subject: "Science",
      title: "Plant cell diagram labeling",
      assignedDate: daysAgo(6),
      dueDate: daysAgo(1),
      status: "submitted",
    },
    {
      id: `${studentId}-hw-3`,
      studentId,
      subject: "English",
      title: "Book report — chapter 4",
      assignedDate: daysAgo(10),
      dueDate: daysAgo(3),
      status: "graded",
      grade: "A-",
    },
    {
      id: `${studentId}-hw-4`,
      studentId,
      subject: "History",
      title: "Timeline of local history",
      assignedDate: daysAgo(9),
      dueDate: daysAgo(2),
      status: "overdue",
    },
  ];
}

export function buildExamResults(studentId: string): ExamResult[] {
  return [
    { id: `${studentId}-ex-1`, studentId, examName: "Mid-term", subject: "Mathematics", date: daysAgo(20), marksObtained: 82, maxMarks: 100, grade: "A" },
    { id: `${studentId}-ex-2`, studentId, examName: "Mid-term", subject: "Science", date: daysAgo(20), marksObtained: 76, maxMarks: 100, grade: "B+" },
    { id: `${studentId}-ex-3`, studentId, examName: "Mid-term", subject: "English", date: daysAgo(19), marksObtained: 88, maxMarks: 100, grade: "A" },
    { id: `${studentId}-ex-4`, studentId, examName: "Unit test 1", subject: "History", date: daysAgo(45), marksObtained: 41, maxMarks: 50, grade: "A-" },
  ];
}

export function buildFeeInvoices(studentId: string): FeeInvoice[] {
  return [
    { id: `${studentId}-fee-1`, studentId, term: "Term 1", amount: 45000, dueDate: daysAgo(90), status: "paid", paidOn: daysAgo(88) },
    { id: `${studentId}-fee-2`, studentId, term: "Term 2", amount: 45000, dueDate: daysFromNow(5), status: "due" },
  ];
}

export function buildMessageThreads(studentId: string, teacherName: string): MessageThread[] {
  return [
    {
      id: `${studentId}-thread-1`,
      studentId,
      teacherName,
      subject: "Progress check-in",
      messages: [
        {
          id: `${studentId}-msg-1`,
          sender: "teacher",
          body: "Hi! Just wanted to share that your child has been doing great in class discussions this week.",
          sentAt: daysAgo(2),
        },
        {
          id: `${studentId}-msg-2`,
          sender: "parent",
          body: "Thank you for letting me know, really appreciate the update!",
          sentAt: daysAgo(2),
        },
      ],
    },
  ];
}

export function buildLeaveRequests(studentId: string): LeaveRequest[] {
  return [
    {
      id: `${studentId}-leave-1`,
      studentId,
      fromDate: daysAgo(30),
      toDate: daysAgo(29),
      reason: "Family function",
      status: "approved",
      requestedAt: daysAgo(33),
    },
  ];
}

export function buildNotifications(): ParentNotification[] {
  return [
    { id: "pn-1", title: "Fee reminder", body: "Term 2 fee is due in 5 days.", createdAt: daysAgo(0), read: false },
    { id: "pn-2", title: "PTM scheduled", body: "Parent-teacher meeting on Aug 12, 4 PM onwards.", createdAt: daysAgo(1), read: false },
    { id: "pn-3", title: "Homework overdue", body: "One homework submission is overdue.", createdAt: daysAgo(2), read: true },
    { id: "pn-4", title: "Report card published", body: "Mid-term report cards are now available.", createdAt: daysAgo(3), read: true },
  ];
}
