import type { UserRole } from "@/types/auth";
import { academicHttpClient, authHttpClient, financeHttpClient } from "@/lib/httpClient";
import { isWithinRange } from "./dateRange";
import type { DashboardScopeView, ScopeMetrics, ScopeSummary } from "./types";

// Every backend service scopes rows by the X-Tenant-Id/X-Branch-Id headers with strict equality —
// there is no "all branches" query — so the aggregated view asks each branch separately (pinning
// the headers per request, which httpClient's interceptor respects) and sums client-side.

type ScopeHeaders = {
  "X-Tenant-Id": string;
  "X-Branch-Id": string;
};

interface StatusRow {
  status: string;
}

interface InvoiceRow {
  status: string;
  netAmount: number;
  paidAmount: number | null;
  dueDate: string;
  paidOn: string | null;
}

interface BranchRow {
  id: string;
  name: string;
  status: "Active" | "Inactive";
}

const EMPTY: ScopeMetrics = { students: 0, staff: 0, feesCollected: 0, feesPending: 0, overdueInvoices: 0, failed: false };

/** Only Admin and Super Admin can switch branches, so only they get the aggregated/segregated choice. */
export function canSwitchScopeView(role: UserRole): boolean {
  return role === "admin" || role === "superAdmin";
}

async function fetchBranchMetrics(headers: ScopeHeaders, range: { start: Date; end: Date }): Promise<ScopeMetrics> {
  const [students, staff, invoices] = await Promise.allSettled([
    academicHttpClient.get<StatusRow[]>("/api/students", { headers }),
    academicHttpClient.get<StatusRow[]>("/api/staff", { headers }),
    financeHttpClient.get<InvoiceRow[]>("/api/feeinvoices", { headers }),
  ]);

  const metrics: ScopeMetrics = { ...EMPTY };
  if (students.status === "fulfilled") {
    metrics.students = students.value.data.filter((s) => s.status === "Active").length;
  }
  if (staff.status === "fulfilled") {
    metrics.staff = staff.value.data.filter((s) => s.status === "Active" || s.status === "OnLeave").length;
  }
  if (invoices.status === "fulfilled") {
    for (const inv of invoices.value.data) {
      const paid = inv.status === "Paid" ? inv.netAmount : (inv.paidAmount ?? 0);
      // Collected counts by when the money came in; pending/overdue by when it fell due.
      if (paid > 0 && isWithinRange(inv.paidOn ?? inv.dueDate, range)) metrics.feesCollected += paid;
      if (inv.status !== "Paid" && isWithinRange(inv.dueDate, range)) {
        metrics.feesPending += Math.max(0, inv.netAmount - paid);
        if (inv.status === "Overdue") metrics.overdueInvoices += 1;
      }
    }
  }
  metrics.failed = [students, staff, invoices].some((r) => r.status === "rejected");
  return metrics;
}

function sum(rows: ScopeMetrics[]): ScopeMetrics {
  return rows.reduce<ScopeMetrics>(
    (acc, m) => ({
      students: acc.students + m.students,
      staff: acc.staff + m.staff,
      feesCollected: acc.feesCollected + m.feesCollected,
      feesPending: acc.feesPending + m.feesPending,
      overdueInvoices: acc.overdueInvoices + m.overdueInvoices,
      failed: acc.failed || m.failed,
    }),
    { ...EMPTY },
  );
}

export async function fetchScopeSummary(
  view: DashboardScopeView,
  tenantId: string,
  selectedBranchId: string,
  range: { start: Date; end: Date },
): Promise<ScopeSummary> {
  const { data } = await authHttpClient.get<BranchRow[]>("/api/branches", { headers: { "X-Tenant-Id": tenantId } });
  const branches =
    view === "aggregated" ? data.filter((b) => b.status === "Active") : data.filter((b) => b.id === selectedBranchId);

  const perBranch = await Promise.all(
    branches.map((b) => fetchBranchMetrics({ "X-Tenant-Id": tenantId, "X-Branch-Id": b.id }, range)),
  );
  return { view, branches: branches.map((b) => ({ id: b.id, name: b.name })), metrics: sum(perBranch) };
}
