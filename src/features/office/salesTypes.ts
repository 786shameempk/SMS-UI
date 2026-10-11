import type { QuoteBreakdown } from "./types";

/** Schools, onboarding, quotations, billing and subscriptions (AuthService `api/office/*`). */

export interface SchoolRequest {
  schoolName: string;
  code: string;
  subdomain: string;
  schoolType: string | null;
  board: string | null;
  country: string | null;
  state: string | null;
  city: string | null;
  address: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  billingContactName: string | null;
  billingContactEmail: string | null;
  taxId: string | null;
  expectedStudents: number | null;
  branches: number;
  internalNotes: string | null;
}

export interface SchoolListItem {
  id: string;
  schoolName: string;
  code: string;
  city: string | null;
  state: string | null;
  stage: string;
  stageNumber: number;
  status: string;
  ownerUserId: string | null;
  ownerName: string | null;
  blocker: string | null;
  dueDate: string | null;
  tenantId: string | null;
  subscriptionStatus: string | null;
  planName: string | null;
  subscriptionEnds: string | null;
  openTasks: number;
  createdAt: string;
  stageChangedAt: string;
}

export interface SchoolProfile extends SchoolRequest {
  id: string;
  tenantId: string | null;
  stage: string;
  stageNumber: number;
  status: string;
  ownerUserId: string | null;
  ownerName: string | null;
  dueDate: string | null;
  blocker: string | null;
  adminInvite: string;
  createdAt: string;
  stageChangedAt: string;
}

export interface SchoolTask {
  id: string;
  title: string;
  stage: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  dueDate: string | null;
  completedAt: string | null;
  overdue: boolean;
}

export interface SchoolEvent {
  id: string;
  occurredAt: string;
  actorEmail: string | null;
  kind: string;
  message: string;
}

export interface SchoolDocument {
  id: string;
  fileName: string;
  contentType: string;
  sizeBytes: number;
  description: string | null;
  uploadedAt: string;
}

export interface OnboardingSummary {
  stages: Array<{ stage: string; number: number; schools: number }>;
  openSchools: number;
  blocked: number;
  overdueTasks: number;
  stuckSchools: number;
}

export interface QuotationListItem {
  id: string;
  number: string;
  schoolId: string;
  schoolName: string;
  planName: string;
  planVersion: number;
  status: string;
  currency: string;
  total: number;
  discountPercent: number;
  requiresHighDiscountApproval: boolean;
  validUntil: string | null;
  createdByName: string | null;
  createdAt: string;
}

export interface QuotationRequest {
  schoolId: string;
  planId: string;
  contractMonths: number;
  students: number;
  branches: number;
  addons: Array<{ code: string; quantity: number }>;
  discountKind: "Percent" | "Fixed" | null;
  discountValue: number;
  milestones: Array<{ label: string; percent: number; dueInDays: number }> | null;
  installments: number | null;
  removedModules: string[];
  validUntil: string | null;
  internalNotes: string | null;
  customerTerms: string | null;
}

export interface Quotation {
  id: string;
  number: string;
  schoolId: string;
  schoolName: string;
  planId: string;
  planName: string;
  planVersionId: string;
  planVersion: number;
  status: string;
  input: Omit<QuotationRequest, "schoolId" | "planId" | "validUntil" | "internalNotes" | "customerTerms">;
  breakdown: QuoteBreakdown | null;
  currency: string;
  total: number;
  requiresHighDiscountApproval: boolean;
  validUntil: string | null;
  internalNotes: string | null;
  customerTerms: string | null;
  createdByName: string | null;
  createdAt: string;
  generatedAt: string | null;
  submittedAt: string | null;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  canApprove: boolean;
  purchaseExists: boolean;
}

export interface InvoiceListItem {
  id: string;
  number: string;
  schoolId: string;
  schoolName: string;
  kind: string;
  label: string | null;
  status: string;
  overdue: boolean;
  issueDate: string;
  dueDate: string;
  currency: string;
  total: number;
  amountPaid: number;
  amountCredited: number;
  outstanding: number;
  daysOverdue: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  invoiceNumber: string;
  schoolId: string;
  schoolName: string;
  amount: number;
  currency: string;
  method: string;
  reference: string | null;
  receivedOn: string;
  status: string;
  recordedByName: string | null;
  recordedAt: string;
  verifiedByName: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  notes: string | null;
  canVerify: boolean;
}

export interface Invoice extends Omit<InvoiceListItem, "daysOverdue"> {
  purchaseId: string | null;
  subscriptionId: string | null;
  lines: Array<{ description: string; amount: number }>;
  subtotal: number;
  taxAmount: number;
  pendingVerification: number;
  voidReason: string | null;
  payments: Payment[];
  creditNotes: Array<{ id: string; number: string; amount: number; reason: string; createdAt: string }>;
  createdAt: string;
}

export interface Purchase {
  id: string;
  quotationId: string;
  quotationNumber: string;
  schoolId: string;
  schoolName: string;
  status: string;
  currency: string;
  totalAmount: number;
  confirmedByName: string | null;
  confirmedAt: string;
  creditApprovedByName: string | null;
  creditReason: string | null;
  creditApprovedAt: string | null;
  subscriptionId: string | null;
  fulfilledAt: string | null;
  notes: string | null;
  paid: number;
  outstanding: number;
  paymentRuleMet: boolean;
  activationRule: string;
  invoices: InvoiceListItem[];
  cancelReason: string | null;
}

export interface Entitlements {
  modules: string[];
  aiFeatures: string[];
  mobileApps: string[];
  features: string[];
  maxStudents: number;
  maxBranches: number;
  maxUsers: number;
  storageGb: number;
}

export interface SubscriptionListItem {
  id: string;
  schoolId: string;
  schoolName: string;
  tenantId: string;
  planName: string;
  planVersion: number;
  status: string;
  startDate: string;
  endDate: string;
  daysLeft: number;
  currency: string;
  renewalAmount: number;
  autoRenew: boolean;
  overdueAmount: number;
  maxStudents: number;
  maxBranches: number;
}

export interface EntitlementOverride {
  id: string;
  kind: string;
  key: string;
  granted: boolean;
  value: number | null;
  effectiveFrom: string;
  effectiveTo: string | null;
  reason: string;
  createdAt: string;
  removedAt: string | null;
  inEffect: boolean;
}

export interface ScheduledChange {
  id: string;
  kind: string;
  effectiveOn: string;
  quotationId: string | null;
  quotationNumber: string | null;
  reason: string | null;
  status: string;
  failureMessage: string | null;
  createdAt: string;
  appliedAt: string | null;
}

export interface Subscription {
  id: string;
  schoolId: string;
  schoolName: string;
  tenantId: string;
  planId: string;
  planName: string;
  planVersion: number;
  status: string;
  allowedMoves: string[];
  startDate: string;
  endDate: string;
  trialEndsOn: string | null;
  termMonths: number;
  cycleMonths: number;
  currency: string;
  renewalAmount: number;
  autoRenew: boolean;
  graceDays: number;
  activatedAt: string | null;
  suspendedAt: string | null;
  suspendedReason: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  included: Entitlements;
  effective: Entitlements;
  overrides: EntitlementOverride[];
  scheduledChanges: ScheduledChange[];
  history: Array<{ id: string; occurredAt: string; actorEmail: string | null; kind: string; fromStatus: string | null; toStatus: string | null; message: string }>;
  openInvoices: InvoiceListItem[];
  purchaseId: string | null;
  adminInvite: string;
  dataRetentionUntil: string | null;
  dataErasedAt: string | null;
}

export interface DeletionRequest {
  id: string;
  schoolId: string;
  status: "Pending" | "Executed" | "Rejected" | "Cancelled";
  reason: string;
  requestedByName: string | null;
  requestedAt: string;
  decidedByName: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  result: string | null;
  canDecide: boolean;
}

export interface UnmanagedTenant {
  tenantId: string;
  schoolName: string;
  subdomain: string;
  status: string;
  planName: string;
  users: number;
  branches: number;
  adminEmail: string | null;
  createdAt: string;
}

export interface AdoptRequest {
  tenantId: string;
  planId: string;
  termMonths: number | null;
  endDate: string | null;
  keepCurrentEntitlements: boolean;
  autoRenew: boolean;
  notes: string | null;
}

export interface SchoolAdmin {
  id: string;
  email: string;
  name: string;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  locked: boolean;
}
