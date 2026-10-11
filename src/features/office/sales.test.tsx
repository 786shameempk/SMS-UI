import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "@/test/utils";
import BillingPage from "./pages/BillingPage";
import InvoicesPage from "./pages/InvoicesPage";
import OnboardingPage from "./pages/OnboardingPage";
import QuotationDetailPage from "./pages/QuotationDetailPage";
import SchoolsPage from "./pages/SchoolsPage";
import SubscriptionDetailPage from "./pages/SubscriptionDetailPage";
import { useOfficeStore } from "./store";
import type { Invoice, Payment, Quotation, SchoolListItem, Subscription } from "./salesTypes";

const api = vi.hoisted(() => ({
  listSchools: vi.fn(),
  unmanagedTenants: vi.fn(),
  adoptSchool: vi.fn(),
  createSchool: vi.fn(),
  onboardingSummary: vi.fn(),
  getQuotation: vi.fn(),
  quotationAction: vi.fn(),
  updateQuotation: vi.fn(),
  confirmPurchase: vi.fn(),
  fetchDocument: vi.fn(),
  listInvoices: vi.fn(),
  getInvoice: vi.fn(),
  listPayments: vi.fn(),
  recordPayment: vi.fn(),
  verifyPayment: vi.fn(),
  rejectPayment: vi.fn(),
  voidInvoice: vi.fn(),
  issueCreditNote: vi.fn(),
  getSubscription: vi.fn(),
  subscriptionAction: vi.fn(),
  resyncSubscription: vi.fn(),
  addOverride: vi.fn(),
  removeOverride: vi.fn(),
  scheduleChange: vi.fn(),
  cancelScheduledChange: vi.fn(),
  listQuotations: vi.fn(),
}));
vi.mock("./api/sales", () => api);
vi.mock("./api/plans", () => ({
  getCatalog: vi.fn().mockResolvedValue({ modules: [{ key: "Library Management", label: "Library", description: null }], aiFeatures: [], mobileApps: [], features: [], alwaysIncludedModules: [] }),
  sellablePlans: vi.fn().mockResolvedValue([]),
  listAddons: vi.fn().mockResolvedValue([]),
  getPublishedVersion: vi.fn(),
  previewPricing: vi.fn(),
}));
vi.mock("./api/team", () => ({ listOfficeUsers: vi.fn().mockResolvedValue({ items: [] }) }));

const page = <T,>(items: T[]) => ({ items, pageNumber: 1, totalPages: 1, totalCount: items.length, hasPreviousPage: false, hasNextPage: false });

const asUser = (permissions: string[]) =>
  useOfficeStore.setState({ status: "signedIn", user: { id: "u", email: "a@b.c", displayName: "A", roleId: "r", role: "R", permissions, mfaEnabled: false, isActive: true, lastLoginAt: null, mustChangePassword: false } });

beforeEach(() => vi.clearAllMocks());
afterEach(() => useOfficeStore.setState({ status: "signedOut", user: null }));

const school = (over: Partial<SchoolListItem> = {}): SchoolListItem => ({
  id: "s1", schoolName: "Green Valley", code: "GV", city: "Pune", state: "MH", stage: "Plan proposed", stageNumber: 4, status: "Open", ownerUserId: null, ownerName: null, blocker: null, dueDate: null,
  tenantId: null, subscriptionStatus: null, planName: null, subscriptionEnds: null, openTasks: 2, createdAt: "2026-10-01T00:00:00Z", stageChangedAt: "2026-10-02T00:00:00Z", ...over,
});

describe("Schools", () => {
  it("lists schools with their stage, and offers Add school only to people who manage schools", async () => {
    asUser(["schools.view"]);
    api.listSchools.mockResolvedValue(page([school()]));
    renderWithProviders(<SchoolsPage />);
    expect(await screen.findByText("Green Valley")).toBeInTheDocument();
    expect(screen.getByText("4. Plan proposed")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add school/ })).not.toBeInTheDocument();
  });

  it("creates a school from the dialog, deriving the subdomain from the name", async () => {
    asUser(["schools.view", "schools.manage"]);
    api.listSchools.mockResolvedValue(page([]));
    api.createSchool.mockResolvedValue({ id: "new" });
    renderWithProviders(<SchoolsPage />);
    await userEvent.click(await screen.findByRole("button", { name: /Add school/ }));
    await userEvent.type(screen.getByLabelText("School name *"), "Blue Hills School");
    expect(screen.getByLabelText("Subdomain *")).toHaveValue("blue-hills-school");
    await userEvent.click(screen.getByRole("button", { name: "Add school" }));
    await waitFor(() => expect(api.createSchool).toHaveBeenCalledTimes(1));
    expect(api.createSchool.mock.calls[0][0]).toMatchObject({ schoolName: "Blue Hills School", subdomain: "blue-hills-school" });
  });
});

describe("Onboarding board", () => {
  it("places each school in its stage column and flags blockers", async () => {
    asUser(["onboarding.view"]);
    api.onboardingSummary.mockResolvedValue({ stages: [], openSchools: 2, blocked: 1, overdueTasks: 0, stuckSchools: 0 });
    api.listSchools.mockResolvedValue(page([school(), school({ id: "s2", schoolName: "Hill Top", stageNumber: 7, stage: "Payment verification completed", blocker: "Waiting for the cheque" })]));
    renderWithProviders(<OnboardingPage />);
    const column = await screen.findByRole("listitem", { name: /7\. Payment verification completed/ });
    expect(within(column).getByText("Hill Top")).toBeInTheDocument();
    expect(within(column).getByText(/Waiting for the cheque/)).toBeInTheDocument();
    expect(within(screen.getByRole("listitem", { name: /4\. Plan proposed/ })).getByText("Green Valley")).toBeInTheDocument();
  });
});

const quotation = (over: Partial<Quotation> = {}): Quotation => ({
  id: "q1", number: "QT-2026-0001", schoolId: "s1", schoolName: "Green Valley", planId: "p1", planName: "Growth", planVersionId: "v1", planVersion: 1, status: "PendingApproval",
  input: { contractMonths: 12, students: 500, branches: 1, addons: [], discountKind: null, discountValue: 0, milestones: null, installments: null, removedModules: [] },
  breakdown: null, currency: "INR", total: 118000, requiresHighDiscountApproval: false, validUntil: null, internalNotes: null, customerTerms: null, createdByName: "Sam", createdAt: "2026-10-01T00:00:00Z",
  generatedAt: null, submittedAt: null, decidedByName: null, decidedAt: null, decisionNote: null, canApprove: true, purchaseExists: false, ...over,
});

const renderQuote = () => renderWithProviders(<QuotationDetailPage />, { route: "/office/quotations/q1", path: "/office/quotations/:id" });

describe("Quotation workflow", () => {
  it("shows Approve only when the server says this person may approve it", async () => {
    asUser(["quotations.view", "quotations.approve"]);
    api.getQuotation.mockResolvedValue(quotation({ canApprove: false }));
    renderQuote();
    await screen.findByText("QT-2026-0001");
    expect(screen.queryByRole("button", { name: /Approve/ })).not.toBeInTheDocument();
  });

  it("approves with a confirmation", async () => {
    asUser(["quotations.view", "quotations.approve"]);
    api.getQuotation.mockResolvedValue(quotation());
    api.quotationAction.mockResolvedValue(quotation({ status: "Approved" }));
    renderQuote();
    await userEvent.click(await screen.findByRole("button", { name: /Approve/ }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Approve" }));
    await waitFor(() => expect(api.quotationAction).toHaveBeenCalledWith("q1", "approve", ""));
  });

  it("will not reject without a reason", async () => {
    asUser(["quotations.view", "quotations.approve"]);
    api.getQuotation.mockResolvedValue(quotation());
    renderQuote();
    await userEvent.click(await screen.findByRole("button", { name: /Reject/ }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Reject" }));
    expect(api.quotationAction).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Reason"), "Discount too deep");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Reject" }));
    await waitFor(() => expect(api.quotationAction).toHaveBeenCalledWith("q1", "reject", "Discount too deep"));
  });

  it("offers Confirm purchase for an approved quotation to purchase managers only", async () => {
    asUser(["quotations.view"]);
    api.getQuotation.mockResolvedValue(quotation({ status: "Approved" }));
    const { unmount } = renderQuote();
    await screen.findByText("QT-2026-0001");
    expect(screen.queryByRole("button", { name: "Confirm purchase" })).not.toBeInTheDocument();
    unmount();
    asUser(["quotations.view", "purchases.manage"]);
    renderQuote();
    expect(await screen.findByRole("button", { name: "Confirm purchase" })).toBeInTheDocument();
  });
});

const payment = (over: Partial<Payment> = {}): Payment => ({
  id: "pay1", invoiceId: "i1", invoiceNumber: "INV-2026-0001", schoolId: "s1", schoolName: "Green Valley", amount: 59000, currency: "INR", method: "BankTransfer", reference: "UTR1", receivedOn: "2026-10-03",
  status: "PendingVerification", recordedByName: "Sam", recordedAt: "2026-10-03T00:00:00Z", verifiedByName: null, verifiedAt: null, rejectionReason: null, notes: null, canVerify: true, ...over,
});

describe("Payments", () => {
  it("lets a verifier verify someone else's payment", async () => {
    asUser(["billing.view", "payments.verify"]);
    api.listPayments.mockResolvedValue(page([payment()]));
    api.listInvoices.mockResolvedValue(page([]));
    api.verifyPayment.mockResolvedValue(payment({ status: "Verified" }));
    renderWithProviders(<BillingPage />);
    await userEvent.click(await screen.findByRole("button", { name: "Verify" }));
    await waitFor(() => expect(api.verifyPayment).toHaveBeenCalledWith("pay1"));
  });

  it("disables Verify on a payment the person recorded themselves", async () => {
    asUser(["billing.view", "payments.verify"]);
    api.listPayments.mockResolvedValue(page([payment({ canVerify: false })]));
    api.listInvoices.mockResolvedValue(page([]));
    renderWithProviders(<BillingPage />);
    expect(await screen.findByRole("button", { name: "Verify" })).toBeDisabled();
    expect(screen.getByText("Recorded by you")).toBeInTheDocument();
  });

  it("shows no verify controls to someone who cannot verify payments", async () => {
    asUser(["billing.view"]);
    api.listPayments.mockResolvedValue(page([payment()]));
    api.listInvoices.mockResolvedValue(page([]));
    renderWithProviders(<BillingPage />);
    await screen.findByText("INV-2026-0001");
    expect(screen.queryByRole("button", { name: "Verify" })).not.toBeInTheDocument();
  });

  it("warns about overdue invoices", async () => {
    asUser(["billing.view"]);
    api.listPayments.mockResolvedValue(page([]));
    api.listInvoices.mockResolvedValue(page([{ id: "i9", number: "INV-9", schoolName: "Late School", currency: "INR", outstanding: 5000, daysOverdue: 12 }]));
    renderWithProviders(<BillingPage />);
    expect(await screen.findByText(/1 overdue invoice/)).toBeInTheDocument();
    expect(screen.getByText(/12 days late/)).toBeInTheDocument();
  });
});

const invoice = (over: Partial<Invoice> = {}): Invoice => ({
  id: "i1", number: "INV-2026-0001", schoolId: "s1", schoolName: "Green Valley", kind: "Purchase", label: "Instalment 1", status: "Issued", overdue: false, issueDate: "2026-10-01", dueDate: "2026-10-16",
  currency: "INR", total: 59000, amountPaid: 0, amountCredited: 0, outstanding: 59000, purchaseId: "pu1", subscriptionId: null, lines: [{ description: "Growth plan", amount: 50000 }], subtotal: 50000,
  taxAmount: 9000, pendingVerification: 0, voidReason: null, payments: [], creditNotes: [], createdAt: "2026-10-01T00:00:00Z", ...over,
});

describe("Invoices", () => {
  const open = async () => {
    api.listInvoices.mockResolvedValue(page([{ ...invoice(), daysOverdue: 0 }]));
    api.getInvoice.mockResolvedValue(invoice());
    renderWithProviders(<InvoicesPage />, { route: "/office/invoices?id=i1" });
    await screen.findByText("Invoice INV-2026-0001");
  };

  it("sends one idempotency key per recording, so a double click cannot pay twice", async () => {
    asUser(["billing.view", "payments.record"]);
    api.recordPayment.mockResolvedValue(payment());
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Record payment" }));
    const dialog = await screen.findByRole("dialog", { name: "Record a payment" });
    await userEvent.type(within(dialog).getByLabelText("Reference (UTR, cheque no.)"), "UTR-77");
    await userEvent.click(within(dialog).getByRole("button", { name: "Record payment" }));
    await waitFor(() => expect(api.recordPayment).toHaveBeenCalledTimes(1));
    const [body, key] = api.recordPayment.mock.calls[0];
    expect(body).toMatchObject({ invoiceId: "i1", amount: 59000, method: "BankTransfer", reference: "UTR-77" });
    expect(key).toMatch(/[0-9a-f-]{36}/);
  });

  it("offers Record payment only to people who may record payments", async () => {
    asUser(["billing.view"]);
    await open();
    expect(screen.queryByRole("button", { name: "Record payment" })).not.toBeInTheDocument();
  });

  it("voids an unpaid invoice only with a reason", async () => {
    asUser(["billing.view", "invoices.manage"]);
    api.voidInvoice.mockResolvedValue(invoice({ status: "Void" }));
    await open();
    await userEvent.click(screen.getByRole("button", { name: "Void" }));
    await userEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Void invoice" }));
    expect(api.voidInvoice).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText("Reason"), "Wrong school");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Void invoice" }));
    await waitFor(() => expect(api.voidInvoice).toHaveBeenCalledWith("i1", "Wrong school"));
  });
});

const entitlements = (over: Partial<Subscription["included"]> = {}) => ({ modules: ["Students", "Fee Management"], aiFeatures: [], mobileApps: [], features: [], maxStudents: 500, maxBranches: 1, maxUsers: 50, storageGb: 50, ...over });
const subscription = (over: Partial<Subscription> = {}): Subscription => ({
  id: "sub1", schoolId: "s1", schoolName: "Green Valley", tenantId: "tenant-gv", planId: "p1", planName: "Growth", planVersion: 1, status: "Active", allowedMoves: ["PaymentOverdue", "RenewalPending", "Expired", "Suspended", "Cancelled"],
  startDate: "2026-10-01", endDate: "2027-10-01", trialEndsOn: null, termMonths: 12, cycleMonths: 12, currency: "INR", renewalAmount: 118000, autoRenew: true, graceDays: 7, activatedAt: null, suspendedAt: null,
  suspendedReason: null, cancelledAt: null, cancelReason: null, included: entitlements(), effective: entitlements({ modules: ["Students", "Fee Management", "Library Management"] }), overrides: [
    { id: "o1", kind: "Module", key: "Library Management", granted: true, value: null, effectiveFrom: "2026-10-01", effectiveTo: null, reason: "Pilot", createdAt: "2026-10-01T00:00:00Z", removedAt: null, inEffect: true },
  ], scheduledChanges: [], history: [{ id: "h1", occurredAt: "2026-10-01T00:00:00Z", actorEmail: "ops@x", kind: "Status", fromStatus: null, toStatus: "Active", message: "Activated." }], openInvoices: [], purchaseId: "pu1", adminInvite: "Sent", dataRetentionUntil: null, dataErasedAt: null, ...over,
});
const renderSub = () => renderWithProviders(<SubscriptionDetailPage />, { route: "/office/subscriptions/sub1", path: "/office/subscriptions/:id" });

describe("Subscription", () => {
  it("shows what was sold next to what the school has today, and the override that explains the difference", async () => {
    asUser(["subscriptions.view", "entitlements.view"]);
    api.getSubscription.mockResolvedValue(subscription());
    renderSub();
    const sold = await screen.findByRole("region", { name: "Sold entitlements" });
    const today = screen.getByRole("region", { name: "Current entitlements" });
    expect(sold).not.toHaveTextContent("Library Management");
    expect(today).toHaveTextContent("Library Management");
    expect(screen.getByText(/Pilot/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add override/ })).not.toBeInTheDocument();
  });

  it("suspends only with a reason, for someone who controls school access", async () => {
    asUser(["subscriptions.view", "tenants.control"]);
    api.getSubscription.mockResolvedValue(subscription());
    api.subscriptionAction.mockResolvedValue(subscription({ status: "Suspended" }));
    renderSub();
    await userEvent.click(await screen.findByRole("button", { name: "Suspend" }));
    await userEvent.type(screen.getByLabelText("Reason"), "Legal review");
    await userEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Suspend" }));
    await waitFor(() => expect(api.subscriptionAction).toHaveBeenCalledWith("sub1", "suspend", { reason: "Legal review", overridePolicy: undefined }));
  });

  it("hides Suspend and Cancel from someone without control of school access", async () => {
    asUser(["subscriptions.view", "subscriptions.manage"]);
    api.getSubscription.mockResolvedValue(subscription());
    renderSub();
    await screen.findByRole("region", { name: "Sold entitlements" });
    expect(screen.queryByRole("button", { name: "Suspend" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Renew" })).toBeInTheDocument();
  });

  it("offers the overdue-policy override only to someone who can verify payments", async () => {
    api.getSubscription.mockResolvedValue(subscription({ status: "Suspended", allowedMoves: ["Active", "Cancelled"] }));
    asUser(["subscriptions.view", "tenants.control"]);
    const first = renderSub();
    await userEvent.click(await screen.findByRole("button", { name: "Reactivate" }));
    expect(screen.queryByLabelText(/Override the overdue-invoice policy/)).not.toBeInTheDocument();
    first.unmount();
    asUser(["subscriptions.view", "tenants.control", "payments.verify"]);
    renderSub();
    await userEvent.click(await screen.findByRole("button", { name: "Reactivate" }));
    expect(screen.getByLabelText(/Override the overdue-invoice policy/)).toBeInTheDocument();
  });

  it("removes an override on request", async () => {
    asUser(["subscriptions.view", "entitlements.manage"]);
    api.getSubscription.mockResolvedValue(subscription());
    api.removeOverride.mockResolvedValue(subscription({ overrides: [] }));
    renderSub();
    await userEvent.click(await screen.findByRole("button", { name: "Remove override Module Library Management" }));
    await waitFor(() => expect(api.removeOverride).toHaveBeenCalledWith("sub1", "o1"));
  });
});

describe("Re-syncing a school", () => {
  it("needs a reason, and can sign every user out", async () => {
    asUser(["subscriptions.view", "tenants.control"]);
    api.getSubscription.mockResolvedValue(subscription());
    api.resyncSubscription.mockResolvedValue(subscription());
    renderSub();
    await userEvent.click(await screen.findByRole("button", { name: "Re-sync school" }));
    const dialog = await screen.findByRole("dialog");
    await userEvent.click(within(dialog).getByRole("button", { name: "Re-sync" }));
    expect(api.resyncSubscription).not.toHaveBeenCalled();
    await userEvent.type(within(dialog).getByLabelText("Reason"), "After a support call");
    await userEvent.click(within(dialog).getByLabelText(/sign every user out/));
    await userEvent.click(within(dialog).getByRole("button", { name: "Re-sync" }));
    await waitFor(() => expect(api.resyncSubscription).toHaveBeenCalledWith("sub1", "After a support call", true));
  });

  it("is not offered to someone who cannot control school access", async () => {
    asUser(["subscriptions.view", "subscriptions.manage"]);
    api.getSubscription.mockResolvedValue(subscription());
    renderSub();
    await screen.findByRole("region", { name: "Sold entitlements" });
    expect(screen.queryByRole("button", { name: "Re-sync school" })).not.toBeInTheDocument();
  });
});
