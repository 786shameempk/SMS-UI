/**
 * Response shapes of the services' dashboard-tab endpoints (AcademicService, FinanceService, CampusService and
 * EngagementService `GET /api/dashboard/*-summary`). One request per tab section instead of downloading lists.
 */

export interface NamedCount {
  name: string;
  count: number;
}

// ── AcademicService ──────────────────────────────────────────────────────────

export interface AdmissionsSummary {
  applicationsInRange: number;
  enrolledInRange: number;
  /** Percent of applications received in the range that are now enrolled. */
  conversionPercent: number | null;
  openApplications: number;
  examsScheduled: number;
  interviewsScheduled: number;
  admissionFeesPending: number;
  funnel: Array<{ stage: string; count: number }>;
  seats: Array<{ className: string; capacity: number; students: number; applications: number }>;
  /** month = yyyy-MM. */
  months: Array<{ month: string; applications: number; enrolled: number }>;
  gender: NamedCount[];
  studentStatus: NamedCount[];
  transfersInRange: number;
  graduatedTotal: number;
  totalCapacity: number;
  activeStudents: number;
}

export interface HrSummary {
  activeStaff: number;
  onLeaveToday: number;
  pendingLeaveRequests: number;
  joinedInRange: number;
  leftInRange: number;
  staffWithoutDocuments: number;
  attendanceToday: { marked: number; present: number; late: number; absent: number; percent: number | null };
  byDepartment: NamedCount[];
  byDesignation: NamedCount[];
  leaveByType: NamedCount[];
  outNext14Days: Array<{ staffId: string; name: string; department: string; leaveType: string; fromDate: string; toDate: string }>;
  months: Array<{ month: string; joined: number; left: number }>;
}

export interface ScoreGroup {
  name: string;
  averageScore: number;
  passRate: number;
  results: number;
}

export interface StudentScore {
  studentId: string;
  name: string;
  classLabel: string;
  averageScore: number;
  results: number;
}

export interface AcademicsSummary {
  averageScore: number;
  passRate: number;
  results: number;
  byClass: ScoreGroup[];
  bySubject: ScoreGroup[];
  grades: NamedCount[];
  topPerformers: StudentScore[];
  needingSupport: StudentScore[];
  chronicAbsentees: Array<{ studentId: string; name: string; classLabel: string; attendancePercent: number; daysAbsent: number }>;
  pipeline: { scheduled: number; ongoing: number; completed: number; completedWithoutResults: number };
  attendanceLast30DaysPercent: number | null;
}

export interface TeacherSummary {
  /** False when the login isn't linked to a staff record. */
  isTeacher: boolean;
  todayPeriods: Array<{
    periodNumber: number;
    label: string;
    startTime: string | null;
    endTime: string | null;
    section: string;
    subject: string | null;
    room: string | null;
    substitution: boolean;
  }>;
  attendanceToMark: Array<{ sectionId: string; label: string; students: number }>;
  submissionsToGrade: number;
  homeworkDueSoon: number;
  marksToEnter: Array<{ examId: string; examName: string; className: string; subject: string }>;
  classPerformance: ScoreGroup[];
  upcomingSubstitutions: Array<{ date: string; periodNumber: number; section: string; reason: string | null }>;
}

// ── FinanceService ───────────────────────────────────────────────────────────

export interface FinanceSummary {
  currency: string;
  collectedToday: number;
  paymentsToday: number;
  collectedThisMonth: number;
  expectedThisMonth: number;
  collectedInRange: number;
  expectedInRange: number;
  collectionRatePercent: number | null;
  outstanding: number;
  defaulterStudents: number;
  defaulterAmount: number;
  ageing: Array<{ label: string; invoices: number; amount: number }>;
  refundsPending: number;
  refundsPendingAmount: number;
  refundsProcessedInRange: number;
  paymentModes: Array<{ mode: string; receipts: number; amount: number }>;
  months: Array<{ month: string; collected: number; expected: number; payrollCost: number | null }>;
  /** Null for callers without payroll access. */
  payrollCostInRange: number | null;
  payslipsUnpaid: number | null;
  payslipsUnpaidAmount: number | null;
}

// ── CampusService ────────────────────────────────────────────────────────────

export interface CampusSummary {
  library: {
    titles: number;
    copies: number;
    availableCopies: number;
    onLoan: number;
    overdue: number;
    dueToday: number;
    returnedToday: number;
    pendingReservations: number;
    members: number;
    finesOutstanding: number;
  } | null;
  transport: {
    buses: number;
    inService: number;
    inMaintenance: number;
    onRoute: number;
    trackingStale: number;
    routes: number;
    assignedStudents: number;
    capacity: number;
    utilisationPercent: number | null;
  } | null;
  hostel: {
    hostels: number;
    beds: number;
    occupied: number;
    occupancyPercent: number | null;
    attendanceMarkedToday: number;
    presentToday: number;
    absentToday: number;
    onLeaveToday: number;
    visitorsInside: number;
    byHostel: Array<{ name: string; beds: number; occupied: number }>;
  } | null;
  inventory: {
    items: number;
    lowStock: number;
    outOfStock: number;
    stockValue: number;
    lowest: Array<{ name: string; inStock: number; reorderLevel: number }>;
  } | null;
  visitors: { insideNow: number; todayTotal: number; expectedToday: number; overstayed: number; watchlist: number; last7Days: number[] } | null;
  health: {
    infirmaryToday: number;
    infirmaryLast7Days: number;
    sentHomeLast7Days: number;
    referredLast7Days: number;
    parentNotNotified: number;
    vaccinationsOverdue: number;
    vaccinationsDueSoon: number;
    checkupsLast90Days: number;
  } | null;
}

export interface HelpdeskSummary {
  open: number;
  unassigned: number;
  breached: number;
  resolvedInRange: number;
  raisedInRange: number;
  averageResolutionHours: number | null;
  byStatus: NamedCount[];
  byCategory: NamedCount[];
  sla: Array<{ priority: string; targetHours: number; open: number; breached: number; averageResolutionHours: number | null }>;
  /** day = yyyy-MM-dd. */
  last14Days: Array<{ day: string; raised: number; resolved: number }>;
}

// ── EngagementService ────────────────────────────────────────────────────────

export interface EngagementSummary {
  surveys: {
    published: number;
    draft: number;
    closed: number;
    responsesInRange: number;
    /** Out of 5. */
    satisfactionScore: number | null;
    active: Array<{ id: string; title: string; audience: string; closesAt: string | null; responses: number }>;
  } | null;
  messaging: {
    sentInRange: number;
    scheduled: number;
    recipientsInRange: number;
    deliveredInRange: number;
    failedInRange: number;
    deliveryRatePercent: number | null;
    byChannel: Array<{ channel: string; delivered: number; failed: number }>;
    awaitingTeacherReply: number;
  } | null;
}

// ── Composed in the browser ──────────────────────────────────────────────────

/** One branch's headline numbers for the executive comparison (sum of what the branch-scoped services return). */
export interface BranchComparisonRow {
  id: string;
  name: string;
  students: number;
  staff: number;
  feesCollected: number;
  feesPending: number;
  overdueInvoices: number;
  failed: boolean;
}
