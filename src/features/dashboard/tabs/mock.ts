import type {
  AcademicsSummary,
  AdmissionsSummary,
  CampusSummary,
  EngagementSummary,
  FinanceSummary,
  HelpdeskSummary,
  HrSummary,
  TeacherSummary,
} from "./types";
import type { ExecutiveData } from "./api";
import type { AcademicSummary, FeeSummary } from "../sources/summaryApi";

/**
 * Sample figures for the dashboard tabs when the Demo data switch is on (see dataSource.ts). They are invented and
 * only ever shown under the "Demo data" banner.
 */

function recentMonths(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (count - 1 - i), 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });
}

function recentDays(count: number): string[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - (count - 1 - i));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
}

const MONTHS = recentMonths(6);

export const MOCK_FINANCE: FinanceSummary = {
  currency: "INR",
  collectedToday: 148_000,
  paymentsToday: 23,
  collectedThisMonth: 1_620_000,
  expectedThisMonth: 2_150_000,
  collectedInRange: 9_480_000,
  expectedInRange: 11_900_000,
  collectionRatePercent: 79.7,
  outstanding: 2_420_000,
  defaulterStudents: 61,
  defaulterAmount: 1_870_000,
  ageing: [
    { label: "Not yet due", invoices: 120, amount: 550_000 },
    { label: "1-30 days", invoices: 84, amount: 640_000 },
    { label: "31-60 days", invoices: 41, amount: 520_000 },
    { label: "61-90 days", invoices: 19, amount: 380_000 },
    { label: "Over 90 days", invoices: 12, amount: 330_000 },
  ],
  refundsPending: 3,
  refundsPendingAmount: 42_000,
  refundsProcessedInRange: 118_000,
  paymentModes: [
    { mode: "Online", receipts: 612, amount: 5_100_000 },
    { mode: "Cash", receipts: 288, amount: 2_600_000 },
    { mode: "Card", receipts: 96, amount: 1_220_000 },
    { mode: "Cheque", receipts: 31, amount: 560_000 },
  ],
  months: MONTHS.map((month, i) => ({ month, collected: 1_350_000 + i * 90_000, expected: 1_900_000 + (i % 2) * 120_000, payrollCost: 1_050_000 + (i % 3) * 20_000 })),
  payrollCostInRange: 6_420_000,
  payslipsUnpaid: 4,
  payslipsUnpaidAmount: 168_000,
};

export const MOCK_ADMISSIONS: AdmissionsSummary = {
  applicationsInRange: 214,
  enrolledInRange: 96,
  conversionPercent: 44.9,
  openApplications: 71,
  examsScheduled: 18,
  interviewsScheduled: 11,
  admissionFeesPending: 9,
  funnel: [
    { stage: "Inquiry", count: 214 },
    { stage: "Registration", count: 168 },
    { stage: "EntranceExam", count: 131 },
    { stage: "Interview", count: 112 },
    { stage: "FeeCollection", count: 104 },
    { stage: "Enrolled", count: 96 },
  ],
  seats: [
    { className: "Grade 1", capacity: 120, students: 112, applications: 14 },
    { className: "Grade 5", capacity: 120, students: 96, applications: 9 },
    { className: "Grade 8", capacity: 100, students: 100, applications: 17 },
    { className: "Grade 10", capacity: 100, students: 88, applications: 6 },
  ],
  months: MONTHS.map((month, i) => ({ month, applications: 24 + i * 6, enrolled: 9 + i * 3 })),
  gender: [
    { name: "Male", count: 512 },
    { name: "Female", count: 488 },
    { name: "Other", count: 4 },
  ],
  studentStatus: [
    { name: "Active", count: 1004 },
    { name: "Transferred", count: 23 },
    { name: "Graduated", count: 140 },
    { name: "Alumni", count: 61 },
  ],
  transfersInRange: 11,
  graduatedTotal: 201,
  totalCapacity: 1100,
  activeStudents: 1004,
};

export const MOCK_HR: HrSummary = {
  activeStaff: 86,
  onLeaveToday: 4,
  pendingLeaveRequests: 5,
  joinedInRange: 7,
  leftInRange: 2,
  staffWithoutDocuments: 12,
  attendanceToday: { marked: 79, present: 71, late: 4, absent: 4, percent: 94.9 },
  byDepartment: [
    { name: "Science", count: 18 },
    { name: "Mathematics", count: 14 },
    { name: "Languages", count: 16 },
    { name: "Administration", count: 12 },
    { name: "Support", count: 26 },
  ],
  byDesignation: [
    { name: "Teacher", count: 52 },
    { name: "Driver", count: 8 },
    { name: "Cleaner", count: 9 },
    { name: "Accountant", count: 3 },
  ],
  leaveByType: [
    { name: "Sick", count: 3 },
    { name: "Casual", count: 4 },
    { name: "Earned", count: 1 },
  ],
  outNext14Days: [
    { staffId: "s1", name: "Meera Nair", department: "Science", leaveType: "Sick", fromDate: recentDays(1)[0], toDate: recentDays(1)[0] },
    { staffId: "s2", name: "Arun Das", department: "Mathematics", leaveType: "Casual", fromDate: recentDays(1)[0], toDate: recentDays(1)[0] },
  ],
  months: MONTHS.map((month, i) => ({ month, joined: i % 3, left: i % 2 })),
};

export const MOCK_ACADEMICS: AcademicsSummary = {
  averageScore: 68,
  passRate: 91,
  results: 5240,
  byClass: [
    { name: "Grade 10", averageScore: 74, passRate: 96, results: 880 },
    { name: "Grade 9", averageScore: 70, passRate: 93, results: 910 },
    { name: "Grade 8", averageScore: 66, passRate: 90, results: 940 },
    { name: "Grade 7", averageScore: 61, passRate: 84, results: 905 },
  ],
  bySubject: [
    { name: "English", averageScore: 76, passRate: 97, results: 1100 },
    { name: "Science", averageScore: 69, passRate: 92, results: 1080 },
    { name: "Mathematics", averageScore: 58, passRate: 78, results: 1090 },
    { name: "Social Science", averageScore: 71, passRate: 94, results: 970 },
  ],
  grades: [
    { name: "A+", count: 640 },
    { name: "A", count: 1180 },
    { name: "B", count: 1720 },
    { name: "C", count: 1150 },
    { name: "D", count: 380 },
    { name: "F", count: 170 },
  ],
  topPerformers: [
    { studentId: "t1", name: "Anika Rao", classLabel: "Grade 10 A", averageScore: 97, results: 18 },
    { studentId: "t2", name: "Rohan Mehta", classLabel: "Grade 9 B", averageScore: 95, results: 18 },
    { studentId: "t3", name: "Sara Thomas", classLabel: "Grade 10 B", averageScore: 94, results: 17 },
  ],
  needingSupport: [
    { studentId: "w1", name: "Imran Ali", classLabel: "Grade 8 C", averageScore: 29, results: 14 },
    { studentId: "w2", name: "Pooja Singh", classLabel: "Grade 7 A", averageScore: 31, results: 14 },
  ],
  chronicAbsentees: [
    { studentId: "a1", name: "Vikram Joshi", classLabel: "Grade 9 A", attendancePercent: 58, daysAbsent: 11 },
    { studentId: "a2", name: "Neha Kapoor", classLabel: "Grade 6 B", attendancePercent: 66, daysAbsent: 8 },
  ],
  pipeline: { scheduled: 4, ongoing: 2, completed: 9, completedWithoutResults: 1 },
  attendanceLast30DaysPercent: 92.4,
};

export const MOCK_TEACHER: TeacherSummary = {
  isTeacher: true,
  todayPeriods: [
    { periodNumber: 1, label: "Period 1", startTime: "09:00:00", endTime: "09:45:00", section: "Grade 8 A", subject: "Mathematics", room: "R-12", substitution: false },
    { periodNumber: 2, label: "Period 2", startTime: "09:45:00", endTime: "10:30:00", section: "Grade 9 B", subject: "Mathematics", room: "R-14", substitution: false },
    { periodNumber: 5, label: "Period 5", startTime: "12:15:00", endTime: "13:00:00", section: "Grade 7 C", subject: null, room: null, substitution: true },
  ],
  attendanceToMark: [{ sectionId: "sec1", label: "Grade 8 A", students: 38 }],
  submissionsToGrade: 17,
  homeworkDueSoon: 2,
  marksToEnter: [{ examId: "e1", examName: "Unit test 2", className: "Grade 9", subject: "Mathematics" }],
  classPerformance: [
    { name: "Grade 8", averageScore: 67, passRate: 91, results: 120 },
    { name: "Grade 9", averageScore: 72, passRate: 95, results: 118 },
  ],
  upcomingSubstitutions: [{ date: recentDays(1)[0], periodNumber: 5, section: "Grade 7 C", reason: "Teacher on leave" }],
};

export const MOCK_CAMPUS: CampusSummary = {
  library: { titles: 4210, copies: 9120, availableCopies: 7980, onLoan: 1140, overdue: 63, dueToday: 28, returnedToday: 41, pendingReservations: 12, members: 1180, finesOutstanding: 5420 },
  transport: { buses: 18, inService: 16, inMaintenance: 2, onRoute: 14, trackingStale: 1, routes: 12, assignedStudents: 612, capacity: 760, utilisationPercent: 80.5 },
  hostel: {
    hostels: 2,
    beds: 220,
    occupied: 187,
    occupancyPercent: 85,
    attendanceMarkedToday: 187,
    presentToday: 176,
    absentToday: 2,
    onLeaveToday: 9,
    visitorsInside: 3,
    byHostel: [
      { name: "Boys' hostel", beds: 120, occupied: 104 },
      { name: "Girls' hostel", beds: 100, occupied: 83 },
    ],
  },
  inventory: {
    items: 340,
    lowStock: 14,
    outOfStock: 3,
    stockValue: 1_240_000,
    lowest: [
      { name: "A4 paper (ream)", inStock: 0, reorderLevel: 40 },
      { name: "Whiteboard markers", inStock: 12, reorderLevel: 60 },
      { name: "First-aid kits", inStock: 2, reorderLevel: 10 },
    ],
  },
  visitors: { insideNow: 6, todayTotal: 34, expectedToday: 9, overstayed: 1, watchlist: 4, last7Days: [22, 30, 28, 35, 31, 12, 34] },
  health: { infirmaryToday: 7, infirmaryLast7Days: 31, sentHomeLast7Days: 6, referredLast7Days: 1, parentNotNotified: 2, vaccinationsOverdue: 18, vaccinationsDueSoon: 44, checkupsLast90Days: 520 },
};

export const MOCK_HELPDESK: HelpdeskSummary = {
  open: 27,
  unassigned: 5,
  breached: 4,
  resolvedInRange: 183,
  raisedInRange: 201,
  averageResolutionHours: 31,
  byStatus: [
    { name: "Open", count: 11 },
    { name: "InProgress", count: 14 },
    { name: "Resolved", count: 150 },
    { name: "Closed", count: 33 },
    { name: "Reopened", count: 2 },
  ],
  byCategory: [
    { name: "Facilities", count: 9 },
    { name: "Transport", count: 7 },
    { name: "FeesBilling", count: 6 },
    { name: "Academic", count: 5 },
  ],
  sla: [
    { priority: "Urgent", targetHours: 4, open: 2, breached: 2, averageResolutionHours: 5 },
    { priority: "High", targetHours: 24, open: 6, breached: 2, averageResolutionHours: 20 },
    { priority: "Medium", targetHours: 72, open: 14, breached: 1, averageResolutionHours: 38 },
    { priority: "Low", targetHours: 120, open: 5, breached: 0, averageResolutionHours: 66 },
  ],
  last14Days: recentDays(14).map((day, i) => ({ day, raised: 4 + (i % 5), resolved: 3 + (i % 4) })),
};

export const MOCK_ENGAGEMENT: EngagementSummary = {
  surveys: {
    published: 3,
    draft: 2,
    closed: 11,
    responsesInRange: 412,
    satisfactionScore: 4.2,
    active: [
      { id: "sv1", title: "Term 2 parent feedback", audience: "Parents", closesAt: null, responses: 238 },
      { id: "sv2", title: "Canteen survey", audience: "Students", closesAt: null, responses: 96 },
    ],
  },
  messaging: {
    sentInRange: 42,
    scheduled: 3,
    recipientsInRange: 18_400,
    deliveredInRange: 17_650,
    failedInRange: 410,
    deliveryRatePercent: 97.7,
    byChannel: [
      { channel: "Sms", delivered: 7_900, failed: 260 },
      { channel: "Email", delivered: 5_100, failed: 120 },
      { channel: "Push", delivered: 4_650, failed: 30 },
    ],
    awaitingTeacherReply: 6,
  },
};

const MOCK_ACADEMIC_SUMMARY: AcademicSummary = {
  activeStudents: 1004,
  admittedInRange: 96,
  activeStaff: 86,
  staffOnLeaveToday: 4,
  today: { date: recentDays(1)[0], marked: 980, attended: 912, absent: 52, late: 16, leave: 16, percent: 93 },
  previousSchoolDay: { date: recentDays(2)[0], marked: 984, attended: 925, absent: 45, late: 14, leave: 14, percent: 94 },
  sectionAttendance: [],
  performance: MONTHS.slice(-4).map((month, i) => ({ month, averageScore: 62 + i * 2, passRate: 86 + i, results: 800 })),
  topPerformers: [],
  upcomingExams: 6,
  pendingHomework: 41,
};

const MOCK_FEE_SUMMARY: FeeSummary = {
  currency: "INR",
  collectedInRange: 9_480_000,
  collectedPreviousRange: 8_900_000,
  pending: 2_420_000,
  overdueCount: 72,
  overdueAmount: 1_870_000,
  paymentsToday: 23,
  collectedToday: 148_000,
  months: MONTHS.map((month, i) => ({ month, collected: 1_350_000 + i * 90_000, expected: 1_900_000 + (i % 2) * 120_000 })),
  statusBreakdown: [],
  topDefaulters: [],
};

export const MOCK_EXECUTIVE: ExecutiveData = {
  academic: MOCK_ACADEMIC_SUMMARY,
  fees: MOCK_FEE_SUMMARY,
  academics: MOCK_ACADEMICS,
  admissions: MOCK_ADMISSIONS,
  hr: MOCK_HR,
  helpdesk: MOCK_HELPDESK,
  branches: [
    { id: "b1", name: "Main campus", students: 640, staff: 54, feesCollected: 6_100_000, feesPending: 1_300_000, overdueInvoices: 38, failed: false },
    { id: "b2", name: "City campus", students: 364, staff: 32, feesCollected: 3_380_000, feesPending: 1_120_000, overdueInvoices: 34, failed: false },
  ],
  failed: [],
};
