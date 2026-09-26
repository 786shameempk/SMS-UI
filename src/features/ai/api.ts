import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { getStudent, listStudents } from "@/features/students/api";
import { listAttendanceRecords } from "@/features/attendance/api";
import { getTranscript } from "@/features/examinations/api";
import { listInvoices, listInvoicesForStudent } from "@/features/fees/api";
import { getAdmissionsReport, getAttendanceTrendReport, getFeeCollectionReport, getStudentPerformanceReport } from "@/features/reports/api";
import { formatCurrency } from "@/utils/format";
import { ACADEMIC_CGPA_RISK_THRESHOLD, ATTENDANCE_RISK_THRESHOLD, RISK_WEIGHTS } from "./constants";
import type { AtRiskStudent, DismissedFlag, DraftRequest, GeneratedDraft, Insight, RiskFlag } from "./types";

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

function pick(phrases: string[]): string {
  return phrases[Math.floor(Math.random() * phrases.length)];
}

// ── Insights ───────────────────────────────────────────────────────────
// Every number below comes straight from the real Reports module's own aggregations —
// this "AI" layer only picks which sentence template best fits the numbers that are
// already there, and rotates phrasing on regenerate. Nothing here is fabricated.

async function attendanceInsight(): Promise<Insight> {
  const report = await getAttendanceTrendReport();
  const points = report.trend.filter((p) => p.studentPercent !== null);
  const first = points[0]?.studentPercent ?? null;
  const last = points[points.length - 1]?.studentPercent ?? null;
  const trendPhrase =
    first !== null && last !== null
      ? last - first >= 2
        ? pick(["trending upward over the last few months", "showing steady improvement recently"])
        : last - first <= -2
          ? pick(["slipping compared to a few months ago", "trending downward recently — worth a closer look"])
          : pick(["holding steady over the last few months", "staying roughly consistent recently"])
      : "not enough history yet to show a trend";

  const headline =
    report.studentAverage >= 90
      ? pick(["Attendance is excellent across the school.", "Students are showing up consistently this term."])
      : report.studentAverage >= 75
        ? pick(["Attendance is healthy overall.", "Most students are meeting attendance expectations."])
        : pick(["Attendance needs attention.", "A meaningful share of students are under-attending."]);

  return {
    area: "attendance",
    headline,
    bullets: [
      `Student attendance is averaging ${report.studentAverage}% this term, ${trendPhrase}.`,
      `Staff attendance is averaging ${report.staffAverage}% over the same period.`,
    ],
  };
}

async function academicsInsight(): Promise<Insight> {
  const report = await getStudentPerformanceReport();
  const classes = [...report.classAverages].sort((a, b) => b.averagePercentage - a.averagePercentage);
  const strongest = classes[0];
  const weakest = classes[classes.length - 1];

  const headline =
    report.overallAverage >= 75
      ? pick(["Academic performance is strong school-wide.", "Students are performing well overall this year."])
      : report.overallAverage >= 55
        ? pick(["Academic performance is middling — room to grow.", "Results are mixed across the school right now."])
        : pick(["Academic performance needs attention.", "Overall scores are below where they should be."]);

  const bullets = [`The school-wide average across exams is ${report.overallAverage}%${report.latestExamName ? `, most recently on ${report.latestExamName}` : ""}.`];
  if (strongest && weakest && strongest.className !== weakest.className) {
    bullets.push(`${strongest.className} is leading at ${strongest.averagePercentage}%, while ${weakest.className} trails at ${weakest.averagePercentage}%.`);
  }
  return { area: "academics", headline, bullets };
}

async function feesInsight(): Promise<Insight> {
  const report = await getFeeCollectionReport();
  const headline =
    report.collectionRate >= 90
      ? pick(["Fee collection is in great shape.", "Collections are tracking very well this term."])
      : report.collectionRate >= 70
        ? pick(["Fee collection is reasonable but has gaps.", "Most fees are coming in, with some pending."])
        : pick(["Fee collection needs follow-up.", "A significant share of fees remain uncollected."]);

  const bullets = [
    `${report.collectionRate}% of billed fees have been collected (${formatCurrency(report.totalCollected)} of ${formatCurrency(report.totalCollected + report.totalPending)}).`,
  ];
  if (report.totalOverdue > 0) bullets.push(`${formatCurrency(report.totalOverdue)} is currently overdue and worth prioritizing for follow-up.`);
  return { area: "fees", headline, bullets };
}

async function admissionsInsight(): Promise<Insight> {
  const report = await getAdmissionsReport();
  const topStatus = [...report.statusBreakdown].sort((a, b) => b.count - a.count)[0];
  const headline =
    report.approvalRate >= 60
      ? pick(["Admissions are converting well.", "The admissions pipeline is healthy."])
      : pick(["Admissions conversion has room to improve.", "Fewer applications are converting to enrollment than ideal."]);

  const bullets = [`${report.totalApplications} applications have come in, with a ${report.approvalRate}% enrollment rate.`];
  if (topStatus) bullets.push(`Most applications are currently at the "${topStatus.status}" stage (${topStatus.count}).`);
  return { area: "admissions", headline, bullets };
}

export async function getInsights(): Promise<Insight[]> {
  const insights = await Promise.all([attendanceInsight(), academicsInsight(), feesInsight(), admissionsInsight()]);
  return insights;
}

// ── At-risk students ─────────────────────────────────────────────────────
// Rule-based flags computed from each real module's own data — not a predictive model,
// just fixed thresholds applied to numbers that already exist elsewhere in the app.

async function attendanceByStudent(): Promise<Map<string, number>> {
  const records = await listAttendanceRecords();
  const byStudent = new Map<string, { present: number; total: number }>();
  for (const r of records) {
    const bucket = byStudent.get(r.studentId) ?? { present: 0, total: 0 };
    bucket.total += 1;
    if (r.status === "present") bucket.present += 1;
    byStudent.set(r.studentId, bucket);
  }
  const result = new Map<string, number>();
  for (const [studentId, { present, total }] of byStudent) {
    if (total > 0) result.set(studentId, Math.round((present / total) * 1000) / 10);
  }
  return result;
}

async function overdueInvoicesByStudent(): Promise<Map<string, { count: number; total: number }>> {
  const invoices = await listInvoices();
  const byStudent = new Map<string, { count: number; total: number }>();
  for (const inv of invoices.filter((i) => i.status === "overdue")) {
    const bucket = byStudent.get(inv.studentId) ?? { count: 0, total: 0 };
    bucket.count += 1;
    bucket.total += inv.netAmount;
    byStudent.set(inv.studentId, bucket);
  }
  return byStudent;
}

// Dismissals are persisted in AcademicService (/api/risk-flags/dismissed), scoped to the
// active tenant/branch server-side. The flags themselves are still computed live below.

export async function listDismissedFlags(): Promise<DismissedFlag[]> {
  return unwrap(academicHttpClient.get<DismissedFlag[]>("/api/risk-flags/dismissed"));
}

export async function dismissStudentFlags(studentId: string): Promise<DismissedFlag> {
  return unwrap(academicHttpClient.post<DismissedFlag>(`/api/risk-flags/dismissed/${studentId}`));
}

export async function restoreStudentFlags(studentId: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/risk-flags/dismissed/${studentId}`));
}

export async function getAtRiskStudents(includeDismissed = false): Promise<AtRiskStudent[]> {
  const [students, attendanceMap, overdueMap, dismissed] = await Promise.all([
    listStudents(),
    attendanceByStudent(),
    overdueInvoicesByStudent(),
    listDismissedFlags(),
  ]);
  const activeStudents = students.filter((s) => s.status === "active");
  const dismissedIds = new Set(dismissed.map((d) => d.studentId));

  const rows = await Promise.all(
    activeStudents.map(async (student): Promise<AtRiskStudent | null> => {
      const flags: RiskFlag[] = [];

      const attendancePct = attendanceMap.get(student.id);
      if (attendancePct !== undefined && attendancePct < ATTENDANCE_RISK_THRESHOLD) {
        flags.push({ reason: "low_attendance", detail: `Present ${attendancePct}% of marked school days (below the school's ${ATTENDANCE_RISK_THRESHOLD}% guideline).` });
      }

      const transcript = await getTranscript(student.id);
      if (transcript.rows.length > 0) {
        const lastRow = transcript.rows[transcript.rows.length - 1];
        if (transcript.cgpa < ACADEMIC_CGPA_RISK_THRESHOLD || lastRow.grade === "F") {
          flags.push({ reason: "academic_risk", detail: `CGPA ${transcript.cgpa}/10 this year; most recent exam (${lastRow.examName}) grade was ${lastRow.grade}.` });
        }
      }

      const overdue = overdueMap.get(student.id);
      if (overdue) {
        flags.push({ reason: "overdue_fees", detail: `${overdue.count} invoice${overdue.count === 1 ? "" : "s"} overdue, totalling ${formatCurrency(overdue.total)}.` });
      }

      if (flags.length === 0) return null;
      if (!includeDismissed && dismissedIds.has(student.id)) return null;

      const riskScore = Math.min(100, flags.reduce((sum, f) => sum + RISK_WEIGHTS[f.reason], 0));
      return { student, riskScore, flags };
    }),
  );

  const filtered = rows.filter((r): r is AtRiskStudent => r !== null).sort((a, b) => b.riskScore - a.riskScore);
  return filtered;
}

// ── Content assistant ────────────────────────────────────────────────────
// Canned templates filled in with a real student's real data from the owning module —
// not a live model call. Returns `notApplicableReason` instead of a draft when the
// scenario genuinely doesn't fit the student's current real data.

async function draftReportCardComment(studentId: string): Promise<GeneratedDraft> {
  const student = await getStudent(studentId);
  const transcript = await getTranscript(studentId);
  if (transcript.rows.length === 0) {
    return { scenario: "report_card_comment", body: "", notApplicableReason: "No exam records yet for this student." };
  }
  const last = transcript.rows[transcript.rows.length - 1];
  const prior = transcript.rows.length > 1 ? transcript.rows[transcript.rows.length - 2] : undefined;
  const trendSentence = prior
    ? last.percentage - prior.percentage >= 3
      ? "This is a clear improvement from the previous exam — keep up the momentum."
      : last.percentage - prior.percentage <= -3
        ? "This is a dip from the previous exam and may be worth a closer look at study habits."
        : "Performance has stayed fairly consistent from the previous exam."
    : "This is the first exam on record for this student.";

  return {
    scenario: "report_card_comment",
    subject: `Report card comment — ${student.firstName} ${student.lastName}`,
    body: `${student.firstName} scored ${last.percentage}% (Grade ${last.grade}) in ${last.examName}, maintaining a CGPA of ${transcript.cgpa}/10 this year. ${trendSentence}`,
  };
}

async function draftFeeReminder(studentId: string): Promise<GeneratedDraft> {
  const student = await getStudent(studentId);
  const invoices = await listInvoicesForStudent(studentId);
  const overdue = invoices.filter((i) => i.status === "overdue");
  if (overdue.length === 0) {
    return { scenario: "fee_reminder", body: "", notApplicableReason: "No overdue fees for this student." };
  }
  const total = overdue.reduce((sum, i) => sum + i.netAmount, 0);
  const listText = overdue.map((i) => `${i.feeType} (${i.term}) — ${formatCurrency(i.netAmount)}, due ${new Date(i.dueDate).toLocaleDateString()}`).join("; ");

  return {
    scenario: "fee_reminder",
    subject: `Fee payment reminder — ${student.firstName} ${student.lastName}`,
    body: `Dear Parent/Guardian, this is a reminder that the following fee${overdue.length === 1 ? " is" : "s are"} overdue for ${student.firstName}: ${listText}. Total outstanding: ${formatCurrency(total)}. Kindly clear the dues at the earliest to avoid further late fees.`,
  };
}

async function draftAttendanceConcern(studentId: string): Promise<GeneratedDraft> {
  const student = await getStudent(studentId);
  const attendanceMap = await attendanceByStudent();
  const pct = attendanceMap.get(studentId);
  if (pct === undefined) {
    return { scenario: "attendance_concern", body: "", notApplicableReason: "No attendance records yet for this student." };
  }
  if (pct >= ATTENDANCE_RISK_THRESHOLD) {
    return { scenario: "attendance_concern", body: "", notApplicableReason: `Attendance is currently healthy (${pct}%) — no concern note needed.` };
  }
  return {
    scenario: "attendance_concern",
    subject: `Attendance check-in — ${student.firstName} ${student.lastName}`,
    body: `Dear Parent/Guardian, we've noticed ${student.firstName}'s attendance this term is at ${pct}%, below the school's expected minimum of ${ATTENDANCE_RISK_THRESHOLD}%. We'd like to understand if anything is affecting regular attendance and how we can support. Please reach out at your convenience.`,
  };
}

async function draftPositiveRecognition(studentId: string): Promise<GeneratedDraft> {
  const student = await getStudent(studentId);
  const [attendanceMap, transcript] = await Promise.all([attendanceByStudent(), getTranscript(studentId)]);
  const pct = attendanceMap.get(studentId);

  if (pct !== undefined && pct >= 95) {
    return {
      scenario: "positive_recognition",
      subject: `Recognizing ${student.firstName} ${student.lastName}`,
      body: `Congratulations to ${student.firstName} for maintaining excellent attendance of ${pct}% this term — a great example of consistency and commitment.`,
    };
  }
  if (transcript.rows.length > 0 && transcript.cgpa >= 8) {
    const last = transcript.rows[transcript.rows.length - 1];
    return {
      scenario: "positive_recognition",
      subject: `Recognizing ${student.firstName} ${student.lastName}`,
      body: `Congratulations to ${student.firstName} for an outstanding academic term — a CGPA of ${transcript.cgpa}/10, including a ${last.grade} grade in the recent ${last.examName}.`,
    };
  }
  return { scenario: "positive_recognition", body: "", notApplicableReason: "No standout attendance or academic metric to highlight right now." };
}

export async function generateDraft(request: DraftRequest): Promise<GeneratedDraft> {
  switch (request.scenario) {
    case "report_card_comment":
      return draftReportCardComment(request.studentId);
    case "fee_reminder":
      return draftFeeReminder(request.studentId);
    case "attendance_concern":
      return draftAttendanceConcern(request.studentId);
    case "positive_recognition":
      return draftPositiveRecognition(request.studentId);
  }
}
