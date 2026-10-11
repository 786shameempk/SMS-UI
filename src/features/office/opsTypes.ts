/** Dashboard, monitoring, reports and settings (AuthService `api/office/*`). */

export interface DashboardKpis {
  totalSchools: number;
  openSchools: number;
  activeSubscriptions: number;
  trialSubscriptions: number;
  overdueSubscriptions: number;
  suspendedSubscriptions: number;
  expiringIn30Days: number;
  mrr: number;
  arr: number;
  collectedInPeriod: number;
  outstanding: number;
  overdue: number;
  pendingVerifications: number;
  pendingVerificationAmount: number;
  quotationsAwaitingApproval: number;
  openAlerts: number;
  criticalAlerts: number;
  excludedOtherCurrency: number;
}

export interface LabelCount {
  label: string;
  count: number;
}

export interface LabelAmount {
  label: string;
  amount: number;
}

export interface OfficeDashboard {
  from: string;
  to: string;
  currency: string;
  kpis: DashboardKpis;
  funnel: LabelCount[];
  newSchools: LabelCount[];
  revenue: LabelAmount[];
  subscriptionsByStatus: LabelCount[];
  mrrByPlan: LabelAmount[];
  conversion: { created: number; approved: number; purchased: number; approvalRate: number; purchaseRate: number };
  expiring: Array<{ subscriptionId: string; schoolName: string; planName: string; endDate: string; daysLeft: number; status: string }>;
}

export interface Alert {
  id: string;
  kind: string;
  severity: "Info" | "Warning" | "Critical";
  status: "Open" | "Acknowledged" | "Resolved";
  schoolId: string | null;
  schoolName: string | null;
  tenantId: string | null;
  title: string;
  detail: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  assignedTo: string | null;
  assignedToName: string | null;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  resolutionNote: string | null;
  autoResolved: boolean;
}

export interface AlertSummary {
  open: number;
  critical: number;
  warning: number;
  info: number;
  unassigned: number;
}

export interface ReportInfo {
  key: string;
  title: string;
  description: string;
  usesDates: boolean;
}

export interface ReportTable {
  key: string;
  title: string;
  columns: string[];
  rows: string[][];
  totals: string[];
  from: string | null;
  to: string | null;
}

export interface OfficeCompany {
  name: string;
  address: string | null;
  taxId: string | null;
  email: string | null;
  phone: string | null;
  paymentInstructions: string | null;
}

export interface OfficeSettingsView {
  company: OfficeCompany;
  policies: {
    highDiscountPercent: number;
    autoApproveWithoutDiscount: boolean;
    defaultValidityDays: number;
    maxValidityDays: number;
    activationRule: string;
    invoiceDueDays: number;
    renewalWindowDays: number;
    reminderEveryDays: number;
    maxReminders: number;
    stuckOnboardingDays: number;
    usageWarnPercent: number;
    webhookConfigured: boolean;
    superAdminMaySelfApprove: boolean;
  };
  jobsEnabled: boolean;
  jobIntervalMinutes: number;
  jobs: Array<{ name: string; lastStartedAt: string | null; lastFinishedAt: string | null; lastSucceeded: boolean | null; lastResult: string | null }>;
}

export interface MaintenanceResult {
  ran: boolean;
  moved: number;
  changesApplied: number;
  quotationsExpired: number;
  renewals: number;
  remindersSent: number;
  alertsRaised: number;
  alertsResolved: number;
  errors: string[];
}
