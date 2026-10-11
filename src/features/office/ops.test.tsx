import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import DashboardPage from "./pages/DashboardPage";
import MonitoringPage from "./pages/MonitoringPage";
import OfficeSettingsPage from "./pages/OfficeSettingsPage";
import ReportsPage from "./pages/ReportsPage";
import { useOfficeStore } from "./store";
import type { Alert, OfficeDashboard, OfficeSettingsView } from "./opsTypes";

const api = vi.hoisted(() => ({
  getDashboard: vi.fn(),
  listAlerts: vi.fn(),
  alertSummary: vi.fn(),
  acknowledgeAlert: vi.fn(),
  assignAlert: vi.fn(),
  resolveAlert: vi.fn(),
  scanAlerts: vi.fn(),
  listReports: vi.fn(),
  runReport: vi.fn(),
  downloadReportCsv: vi.fn(),
  getOfficeSettings: vi.fn(),
  updateCompany: vi.fn(),
  runMaintenanceNow: vi.fn(),
}));
vi.mock("./api/ops", () => api);
vi.mock("./api/team", () => ({ listOfficeUsers: vi.fn().mockResolvedValue({ items: [] }) }));

const page = <T,>(items: T[]) => ({ items, pageNumber: 1, totalPages: 1, totalCount: items.length, hasPreviousPage: false, hasNextPage: false });
const asUser = (permissions: string[]) =>
  useOfficeStore.setState({ status: "signedIn", user: { id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "R", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false } });

beforeEach(() => vi.clearAllMocks());
afterEach(() => useOfficeStore.setState({ status: "signedOut", user: null }));

const dashboard = (): OfficeDashboard => ({
  from: "2026-05-01", to: "2026-10-05", currency: "INR",
  kpis: {
    totalSchools: 12, openSchools: 5, activeSubscriptions: 6, trialSubscriptions: 1, overdueSubscriptions: 1, suspendedSubscriptions: 0, expiringIn30Days: 2, mrr: 83333.33, arr: 1000000, collectedInPeriod: 354000,
    outstanding: 59000, overdue: 59000, pendingVerifications: 2, pendingVerificationAmount: 10000, quotationsAwaitingApproval: 3, openAlerts: 4, criticalAlerts: 1, excludedOtherCurrency: 0,
  },
  funnel: [{ label: "1. Lead or enquiry received", count: 3 }], newSchools: [{ label: "Oct 2026", count: 2 }], revenue: [{ label: "Oct 2026", amount: 354000 }],
  subscriptionsByStatus: [{ label: "Active", count: 6 }], mrrByPlan: [{ label: "Standard", amount: 83333.33 }],
  conversion: { created: 10, approved: 6, purchased: 4, approvalRate: 60, purchaseRate: 40 },
  expiring: [{ subscriptionId: "sub1", schoolName: "Green Valley", planName: "Standard", endDate: "2026-10-20", daysLeft: 15, status: "Active" }],
});

describe("Dashboard", () => {
  it("shows the server's figures, and links to alerts only for people who can see them", async () => {
    asUser(["dashboard.view", "monitoring.view"]);
    api.getDashboard.mockResolvedValue(dashboard());
    renderWithProviders(<DashboardPage />);
    expect(await screen.findByText("Monthly recurring revenue")).toBeInTheDocument();
    expect(screen.getAllByText("INR 83,333.33").length).toBeGreaterThan(0);
    expect(screen.getAllByText("INR 3,54,000.00").length).toBeGreaterThan(0);
    expect(screen.getByText("Green Valley")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Open alerts/ })).toHaveAttribute("href", "/office/monitoring");
  });

  it("does not link to monitoring for someone without it", async () => {
    asUser(["dashboard.view"]);
    api.getDashboard.mockResolvedValue(dashboard());
    renderWithProviders(<DashboardPage />);
    await screen.findByText("Monthly recurring revenue");
    expect(screen.queryByRole("link", { name: /Open alerts/ })).not.toBeInTheDocument();
  });

  it("asks again when the period changes", async () => {
    asUser(["dashboard.view"]);
    api.getDashboard.mockResolvedValue(dashboard());
    renderWithProviders(<DashboardPage />);
    await screen.findByText("Monthly recurring revenue");
    await userEvent.type(screen.getByLabelText("From"), "2026-01-01");
    await waitFor(() => expect(api.getDashboard).toHaveBeenLastCalledWith({ from: "2026-01-01", to: "" }));
  });
});

const alert = (over: Partial<Alert> = {}): Alert => ({
  id: "a1", kind: "PaymentOverdue", severity: "Critical", status: "Open", schoolId: "s1", schoolName: "Green Valley", tenantId: null, title: "INV-1 is 40 days overdue", detail: "INR 59,000 outstanding.",
  firstSeenAt: "2026-09-01T00:00:00Z", lastSeenAt: "2026-10-05T00:00:00Z", assignedTo: null, assignedToName: null, acknowledgedByName: null, acknowledgedAt: null, resolvedByName: null, resolvedAt: null,
  resolutionNote: null, autoResolved: false, ...over,
});

describe("Monitoring", () => {
  beforeEach(() => {
    api.alertSummary.mockResolvedValue({ open: 1, critical: 1, warning: 0, info: 0, unassigned: 1 });
    api.listAlerts.mockResolvedValue(page([alert()]));
  });

  it("lists alerts, with actions only for people who manage monitoring", async () => {
    asUser(["monitoring.view"]);
    renderWithProviders(<MonitoringPage />);
    expect(await screen.findByText("INV-1 is 40 days overdue")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resolve" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Scan now/ })).not.toBeInTheDocument();
  });

  it("will not resolve without saying what was done", async () => {
    asUser(["monitoring.view", "monitoring.manage"]);
    api.resolveAlert.mockResolvedValue(alert({ status: "Resolved" }));
    renderWithProviders(<MonitoringPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Resolve" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Resolve" }));
    expect(api.resolveAlert).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText("What was done?"), "Chased the school; paid.");
    await userEvent.click(within(dialog).getByRole("button", { name: "Resolve" }));
    await waitFor(() => expect(api.resolveAlert).toHaveBeenCalledWith("a1", "Chased the school; paid."));
  });

  it("acknowledges an open alert", async () => {
    asUser(["monitoring.view", "monitoring.manage"]);
    api.acknowledgeAlert.mockResolvedValue(alert({ status: "Acknowledged" }));
    renderWithProviders(<MonitoringPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Acknowledge" }));
    await waitFor(() => expect(api.acknowledgeAlert).toHaveBeenCalledWith("a1"));
  });

  it("says when an alert cleared by itself", async () => {
    asUser(["monitoring.view"]);
    api.listAlerts.mockResolvedValue(page([alert({ status: "Resolved", autoResolved: true, resolutionNote: "The condition cleared." })]));
    renderWithProviders(<MonitoringPage />);
    expect(await screen.findByText(/Cleared on its own/)).toBeInTheDocument();
  });
});

describe("Reports", () => {
  it("runs the first report and offers a CSV download", async () => {
    asUser(["reports.view"]);
    api.listReports.mockResolvedValue([
      { key: "revenue", title: "Revenue collected", description: "Verified payments.", usesDates: true },
      { key: "plans", title: "Plans performance", description: "By plan.", usesDates: false },
    ]);
    api.runReport.mockResolvedValue({ key: "revenue", title: "Revenue collected", columns: ["School", "Amount"], rows: [["Green Valley", "118000.00"]], totals: ["Total", "118000.00"], from: null, to: null });
    renderWithProviders(<ReportsPage />);
    expect(await screen.findByText("Green Valley")).toBeInTheDocument();
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Download CSV/ })).toBeEnabled();
    expect(screen.getByLabelText("From")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Plans performance/ }));
    await waitFor(() => expect(api.runReport).toHaveBeenLastCalledWith("plans", {}));
    expect(screen.queryByLabelText("From")).not.toBeInTheDocument();
  });
});

const settings = (): OfficeSettingsView => ({
  company: { name: "School Sphere", address: null, taxId: "29ABCDE1234F1Z5", email: null, phone: null, paymentInstructions: null },
  policies: { highDiscountPercent: 10, autoApproveWithoutDiscount: false, defaultValidityDays: 30, maxValidityDays: 180, activationRule: "FirstInvoice", invoiceDueDays: 15, renewalWindowDays: 30, reminderEveryDays: 7, maxReminders: 3, stuckOnboardingDays: 14, usageWarnPercent: 90, webhookConfigured: false, superAdminMaySelfApprove: true },
  jobsEnabled: true, jobIntervalMinutes: 60, jobs: [{ name: "office-maintenance", lastStartedAt: null, lastFinishedAt: "2026-10-05T10:00:00Z", lastSucceeded: true, lastResult: "0 subscription(s) moved." }],
});

describe("Office settings", () => {
  it("lets a settings manager save the company name, and refuses a blank one", async () => {
    asUser(["settings.view", "settings.manage"]);
    api.getOfficeSettings.mockResolvedValue(settings());
    api.updateCompany.mockResolvedValue(settings());
    renderWithProviders(<OfficeSettingsPage />);
    const name = await screen.findByLabelText("Company name");
    await userEvent.clear(name);
    expect(screen.getByRole("button", { name: "Save company details" })).toBeDisabled();
    await userEvent.type(name, "School Sphere Pvt Ltd");
    await userEvent.click(screen.getByRole("button", { name: "Save company details" }));
    await waitFor(() => expect(api.updateCompany).toHaveBeenCalled());
    expect(api.updateCompany.mock.calls[0][0]).toMatchObject({ name: "School Sphere Pvt Ltd", taxId: "29ABCDE1234F1Z5" });
  });

  it("is read-only for someone who can only view, and shows the rules as plain text", async () => {
    asUser(["settings.view"]);
    api.getOfficeSettings.mockResolvedValue(settings());
    renderWithProviders(<OfficeSettingsPage />);
    expect(await screen.findByLabelText("Company name")).toBeDisabled();
    expect(screen.queryByRole("button", { name: "Save company details" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Run now/ })).not.toBeInTheDocument();
    expect(screen.getByText("above 10%")).toBeInTheDocument();
    expect(screen.getByText("the first invoice is verified")).toBeInTheDocument();
  });

  it("runs the scheduled work on demand", async () => {
    asUser(["settings.view", "settings.manage"]);
    api.getOfficeSettings.mockResolvedValue(settings());
    api.runMaintenanceNow.mockResolvedValue({ ran: true, moved: 0, changesApplied: 0, quotationsExpired: 0, renewals: 0, remindersSent: 0, alertsRaised: 0, alertsResolved: 0, errors: [] });
    renderWithProviders(<OfficeSettingsPage />);
    await userEvent.click(await screen.findByRole("button", { name: /Run now/ }));
    await waitFor(() => expect(api.runMaintenanceNow).toHaveBeenCalledTimes(1));
  });
});
