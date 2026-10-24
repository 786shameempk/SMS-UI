import type { ExecutiveData } from "./api";
import { compactInr } from "./format";
import { dashboardT, type Translate } from "./i18n";

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
 * Pass the component's `t` so the text follows the interface language.
 */
export function attentionItems(d: ExecutiveData, t: Translate = dashboardT): AttentionItem[] {
  const out: AttentionItem[] = [];
  const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

  if (d.fees && d.fees.overdueCount > 0) {
    out.push({
      id: "fees",
      tone: d.fees.overdueAmount >= 1_00_000 ? "danger" : "warning",
      text: t(plural(d.fees.overdueCount, "{{amount}} in overdue fees across {{count}} invoice", "{{amount}} in overdue fees across {{count}} invoices"), { amount: compactInr(d.fees.overdueAmount), count: d.fees.overdueCount }),
      to: "/fees",
    });
  }
  if (d.helpdesk && d.helpdesk.breached > 0) {
    out.push({
      id: "tickets",
      tone: "danger",
      text: t(plural(d.helpdesk.breached, "{{count}} help desk ticket is past the response target", "{{count}} help desk tickets are past the response target"), { count: d.helpdesk.breached }),
      to: "/helpdesk",
    });
  }
  if (d.academic && d.academic.today.marked > 0 && (d.academic.today.percent ?? 100) < 85) {
    out.push({ id: "attendance", tone: "danger", text: t("Attendance is only {{percent}}% today", { percent: d.academic.today.percent }), to: "/attendance" });
  } else if (d.academic && d.academic.today.marked === 0) {
    out.push({ id: "attendance-unmarked", tone: "warning", text: t("No attendance has been marked yet today"), to: "/attendance" });
  }
  if (d.academics && d.academics.chronicAbsentees.length > 0) {
    out.push({
      id: "absentees",
      tone: "warning",
      text: t(plural(d.academics.chronicAbsentees.length, "{{number}} student has attended under 75% of the last 30 days", "{{number}} students have attended under 75% of the last 30 days"), {
        number: `${d.academics.chronicAbsentees.length}${d.academics.chronicAbsentees.length >= 5 ? "+" : ""}`,
      }),
      to: "/students",
    });
  }
  if (d.academics && d.academics.pipeline.completedWithoutResults > 0) {
    const n = d.academics.pipeline.completedWithoutResults;
    out.push({ id: "results", tone: "warning", text: t(plural(n, "{{count}} completed exam has no marks entered", "{{count}} completed exams have no marks entered"), { count: n }), to: "/examinations" });
  }
  if (d.hr && d.hr.pendingLeaveRequests > 0) {
    out.push({ id: "leave", tone: "warning", text: t(plural(d.hr.pendingLeaveRequests, "{{count}} staff leave request is waiting for a decision", "{{count}} staff leave requests are waiting for a decision"), { count: d.hr.pendingLeaveRequests }), to: "/staff" });
  }
  if (d.admissions && d.admissions.admissionFeesPending > 0) {
    out.push({
      id: "admission-fees",
      tone: "warning",
      text: t(plural(d.admissions.admissionFeesPending, "{{count}} applicant has not paid the admission fee", "{{count}} applicants have not paid the admission fee"), { count: d.admissions.admissionFeesPending }),
      to: "/students",
    });
  }
  return out.sort((a, b) => (a.tone === b.tone ? 0 : a.tone === "danger" ? -1 : 1));
}
