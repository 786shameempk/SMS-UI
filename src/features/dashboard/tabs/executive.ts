import type { ExecutiveData } from "./api";
import { compactInr } from "./format";

export interface AttentionItem {
  id: string;
  tone: "danger" | "warning";
  text: string;
  to: string;
}

/** Fees collected against fees that fell due, as a whole percent over the months the summary covers; null when nothing fell due. */
export function feeCollectionPercent(fees: ExecutiveData["fees"]): number | null {
  if (!fees) return null;
  const expected = fees.months.reduce((s, m) => s + m.expected, 0);
  return expected <= 0 ? null : Math.round((fees.collectedInRange / expected) * 100);
}

/**
 * The few things the leadership should look at first, worst first, built only from the parts the viewer could load.
 * Thresholds are deliberately plain (any overdue amount, any breached ticket) so the list never hides a real problem.
 */
export function attentionItems(d: ExecutiveData): AttentionItem[] {
  const out: AttentionItem[] = [];
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

  if (d.fees && d.fees.overdueCount > 0) {
    out.push({
      id: "fees",
      tone: d.fees.overdueAmount >= 1_00_000 ? "danger" : "warning",
      text: `${compactInr(d.fees.overdueAmount)} in overdue fees across ${d.fees.overdueCount} ${plural(d.fees.overdueCount, "invoice", "invoices")}`,
      to: "/fees",
    });
  }
  if (d.helpdesk && d.helpdesk.breached > 0) {
    out.push({
      id: "tickets",
      tone: "danger",
      text: `${d.helpdesk.breached} help desk ${plural(d.helpdesk.breached, "ticket is", "tickets are")} past the response target`,
      to: "/helpdesk",
    });
  }
  if (d.academic && d.academic.today.marked > 0 && (d.academic.today.percent ?? 100) < 85) {
    out.push({ id: "attendance", tone: "danger", text: `Attendance is only ${d.academic.today.percent}% today`, to: "/attendance" });
  } else if (d.academic && d.academic.today.marked === 0) {
    out.push({ id: "attendance-unmarked", tone: "warning", text: "No attendance has been marked yet today", to: "/attendance" });
  }
  if (d.academics && d.academics.chronicAbsentees.length > 0) {
    out.push({
      id: "absentees",
      tone: "warning",
      text: `${d.academics.chronicAbsentees.length}${d.academics.chronicAbsentees.length >= 5 ? "+" : ""} ${plural(d.academics.chronicAbsentees.length, "student has", "students have")} attended under 75% of the last 30 days`,
      to: "/students",
    });
  }
  if (d.academics && d.academics.pipeline.completedWithoutResults > 0) {
    const n = d.academics.pipeline.completedWithoutResults;
    out.push({ id: "results", tone: "warning", text: `${n} completed ${plural(n, "exam has", "exams have")} no marks entered`, to: "/examinations" });
  }
  if (d.hr && d.hr.pendingLeaveRequests > 0) {
    out.push({ id: "leave", tone: "warning", text: `${d.hr.pendingLeaveRequests} staff leave ${plural(d.hr.pendingLeaveRequests, "request is", "requests are")} waiting for a decision`, to: "/staff" });
  }
  if (d.admissions && d.admissions.admissionFeesPending > 0) {
    out.push({
      id: "admission-fees",
      tone: "warning",
      text: `${d.admissions.admissionFeesPending} ${plural(d.admissions.admissionFeesPending, "applicant has", "applicants have")} not paid the admission fee`,
      to: "/students",
    });
  }
  return out.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "danger" ? -1 : 1));
}
