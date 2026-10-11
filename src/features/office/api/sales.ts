import { officeHttp } from "./http";
import type { Paged } from "../types";
import type {
  OnboardingSummary,
  Invoice,
  InvoiceListItem,
  Payment,
  Purchase,
  Quotation,
  QuotationListItem,
  QuotationRequest,
  SchoolDocument,
  SchoolEvent,
  SchoolListItem,
  SchoolProfile,
  DeletionRequest,
  SchoolAdmin,
  SchoolRequest,
  SchoolTask,
  AdoptRequest,
  Subscription,
  SubscriptionListItem,
  UnmanagedTenant,
} from "../salesTypes";

/** Drops empty filters so they are not sent as blank query parameters. */
const clean = (o: object) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined && v !== "" && v !== "all" && v !== null));

// ── Schools & onboarding ──
export type SchoolQuery = { search?: string; stage?: number; status?: string; ownerId?: string; subscriptionStatus?: string; planId?: string; blocked?: boolean; page?: number; pageSize?: number };
export const listSchools = async (q: SchoolQuery) => (await officeHttp.get<Paged<SchoolListItem>>("schools", { params: clean(q) })).data;
export const onboardingSummary = async () => (await officeHttp.get<OnboardingSummary>("schools/onboarding-summary")).data;
export const getSchool = async (id: string) => (await officeHttp.get<SchoolProfile>(`schools/${id}`)).data;
export const createSchool = async (body: SchoolRequest) => (await officeHttp.post<SchoolProfile>("schools", body)).data;
export const updateSchool = async (id: string, body: SchoolRequest) => (await officeHttp.put<SchoolProfile>(`schools/${id}`, body)).data;
export const assignSchoolOwner = async (id: string, ownerId: string | null) => (await officeHttp.put<SchoolProfile>(`schools/${id}/owner`, { ownerId })).data;
export const setSchoolStage = async (id: string, stage: number, note: string | null) => (await officeHttp.put<SchoolProfile>(`schools/${id}/stage`, { stage, note })).data;
export const setSchoolBlocker = async (id: string, blocker: string | null, dueDate: string | null) => (await officeHttp.put<SchoolProfile>(`schools/${id}/blocker`, { blocker, dueDate })).data;
export const markSchoolLost = async (id: string, reason: string) => (await officeHttp.post<SchoolProfile>(`schools/${id}/lost`, { reason })).data;
export const reopenSchool = async (id: string) => (await officeHttp.post<SchoolProfile>(`schools/${id}/reopen`)).data;
export const schoolEvents = async (id: string) => (await officeHttp.get<SchoolEvent[]>(`schools/${id}/events`)).data;
export const addSchoolNote = async (id: string, note: string) => {
  await officeHttp.post(`schools/${id}/notes`, { note });
};
export const schoolTasks = async (id: string) => (await officeHttp.get<SchoolTask[]>(`schools/${id}/tasks`)).data;
export const addSchoolTask = async (id: string, body: { title: string; assignedTo: string | null; dueDate: string | null }) => (await officeHttp.post<SchoolTask>(`schools/${id}/tasks`, body)).data;
export const updateSchoolTask = async (id: string, taskId: string, body: { completed?: boolean }) => (await officeHttp.put<SchoolTask>(`schools/${id}/tasks/${taskId}`, body)).data;
export const schoolDocuments = async (id: string) => (await officeHttp.get<SchoolDocument[]>(`schools/${id}/documents`)).data;
export const uploadSchoolDocument = async (id: string, file: File, description: string) => {
  const form = new FormData();
  form.append("file", file);
  if (description) form.append("description", description);
  return (await officeHttp.post<SchoolDocument>(`schools/${id}/documents`, form)).data;
};
export const schoolSubscription = async (id: string) => (await officeHttp.get<Subscription | null>(`schools/${id}/subscription`)).data;
export const startTrial = async (id: string, planId: string, days: number | null) => (await officeHttp.post<Subscription>(`schools/${id}/trial`, { planId, days })).data;
export const resendAdminInvite = async (id: string) => {
  await officeHttp.post(`schools/${id}/admin-invite`);
};

// ── Quotations ──
export type QuotationQuery = { search?: string; status?: string; schoolId?: string; page?: number; pageSize?: number };
export const listQuotations = async (q: QuotationQuery) => (await officeHttp.get<Paged<QuotationListItem>>("quotations", { params: clean(q) })).data;
export const getQuotation = async (id: string) => (await officeHttp.get<Quotation>(`quotations/${id}`)).data;
export const createQuotation = async (body: QuotationRequest) => (await officeHttp.post<Quotation>("quotations", body)).data;
export const updateQuotation = async (id: string, body: QuotationRequest) => (await officeHttp.put<Quotation>(`quotations/${id}`, body)).data;
export const quotationAction = async (id: string, action: "generate" | "submit" | "approve" | "reject" | "cancel", text?: string) =>
  (await officeHttp.post<Quotation>(`quotations/${id}/${action}`, action === "reject" ? { reason: text } : action === "approve" || action === "cancel" ? { note: text ?? null } : undefined)).data;
/** The printable document is HTML behind the bearer token, so it is fetched and shown from memory rather than linked. */
export const fetchDocument = async (path: string) => (await officeHttp.get<string>(path, { responseType: "text", transformResponse: (d) => d })).data;

// ── Purchases ──
export const listPurchases = async (q: { status?: string; schoolId?: string; page?: number; pageSize?: number }) => (await officeHttp.get<Paged<Purchase>>("purchases", { params: clean(q) })).data;
export const getPurchase = async (id: string) => (await officeHttp.get<Purchase>(`purchases/${id}`)).data;
export const confirmPurchase = async (quotationId: string, notes: string | null) => (await officeHttp.post<Purchase>(`purchases/from-quotation/${quotationId}`, { notes })).data;
export const approveCredit = async (id: string, reason: string) => (await officeHttp.post<Purchase>(`purchases/${id}/credit`, { reason })).data;
export const cancelPurchase = async (id: string, reason: string) => (await officeHttp.post<Purchase>(`purchases/${id}/cancel`, { reason })).data;

// ── Billing ──
export const listInvoices = async (q: { search?: string; status?: string; schoolId?: string; kind?: string; page?: number; pageSize?: number }) =>
  (await officeHttp.get<Paged<InvoiceListItem>>("invoices", { params: clean(q) })).data;
export const getInvoice = async (id: string) => (await officeHttp.get<Invoice>(`invoices/${id}`)).data;
export const voidInvoice = async (id: string, reason: string) => (await officeHttp.post<Invoice>(`invoices/${id}/void`, { reason })).data;
export const issueCreditNote = async (id: string, amount: number, reason: string) => (await officeHttp.post<Invoice>(`invoices/${id}/credit-notes`, { amount, reason })).data;
export const listPayments = async (q: { status?: string; invoiceId?: string; schoolId?: string; page?: number; pageSize?: number }) => (await officeHttp.get<Paged<Payment>>("payments", { params: clean(q) })).data;
export const recordPayment = async (body: { invoiceId: string; amount: number; method: string; reference: string | null; receivedOn: string; notes: string | null }, idempotencyKey: string) =>
  (await officeHttp.post<Payment>("payments", body, { headers: { "Idempotency-Key": idempotencyKey } })).data;
export const verifyPayment = async (id: string) => (await officeHttp.post<Payment>(`payments/${id}/verify`)).data;
export const rejectPayment = async (id: string, reason: string) => (await officeHttp.post<Payment>(`payments/${id}/reject`, { reason })).data;

// ── Subscriptions ──
export const listSubscriptions = async (q: { search?: string; status?: string; planId?: string; expiringWithinDays?: number; page?: number; pageSize?: number }) =>
  (await officeHttp.get<Paged<SubscriptionListItem>>("subscriptions", { params: clean(q) })).data;
export const getSubscription = async (id: string) => (await officeHttp.get<Subscription>(`subscriptions/${id}`)).data;
export const subscriptionAction = async (id: string, action: "activate" | "renew" | "suspend" | "reactivate" | "cancel", body?: { reason?: string; overridePolicy?: boolean }) =>
  (await officeHttp.post<Subscription>(`subscriptions/${id}/${action}`, body)).data;
export const addOverride = async (id: string, body: { kind: string; key: string | null; granted: boolean; value: number | null; effectiveFrom: string | null; effectiveTo: string | null; reason: string }) =>
  (await officeHttp.post<Subscription>(`subscriptions/${id}/overrides`, body)).data;
export const removeOverride = async (id: string, overrideId: string) => (await officeHttp.delete<Subscription>(`subscriptions/${id}/overrides/${overrideId}`)).data;
export const scheduleChange = async (id: string, body: { kind: string; effectiveOn: string; quotationId: string | null; reason: string | null }) =>
  (await officeHttp.post<Subscription>(`subscriptions/${id}/scheduled-changes`, body)).data;
export const cancelScheduledChange = async (id: string, changeId: string) => (await officeHttp.delete<Subscription>(`subscriptions/${id}/scheduled-changes/${changeId}`)).data;

// ── Schools the office does not manage yet, and school administrator accounts ──
export const unmanagedTenants = async () => (await officeHttp.get<UnmanagedTenant[]>("schools/unmanaged-tenants")).data;
export const adoptSchool = async (body: AdoptRequest) => (await officeHttp.post<Subscription>("schools/adopt", body)).data;
export const schoolAdmins = async (schoolId: string) => (await officeHttp.get<SchoolAdmin[]>(`schools/${schoolId}/admins`)).data;
export const addSchoolAdmin = async (schoolId: string, body: { email: string; name: string; reason: string }) => (await officeHttp.post<SchoolAdmin>(`schools/${schoolId}/admins`, body)).data;
export const replaceSchoolAdmin = async (schoolId: string, body: { userId: string; email: string; name: string; reason: string }) => (await officeHttp.post<SchoolAdmin>(`schools/${schoolId}/admins/replace`, body)).data;
export const resetSchoolAdminPassword = async (schoolId: string, userId: string, reason: string) => {
  await officeHttp.post(`schools/${schoolId}/admins/${userId}/reset-password`, { reason });
};
export const changeSchoolAdminEmail = async (schoolId: string, userId: string, email: string, reason: string) => (await officeHttp.put<SchoolAdmin>(`schools/${schoolId}/admins/${userId}/email`, { email, reason })).data;
export const setSchoolAdminActive = async (schoolId: string, userId: string, active: boolean, reason: string) => (await officeHttp.put<SchoolAdmin>(`schools/${schoolId}/admins/${userId}/active`, { active, reason })).data;
export const resyncSubscription = async (id: string, reason: string, signOutUsers: boolean) => (await officeHttp.post<Subscription>(`subscriptions/${id}/resync`, { reason, signOutUsers })).data;

// ── End of life ──
export const restoreSubscription = async (id: string, reason: string) => (await officeHttp.post<Subscription>(`subscriptions/${id}/restore`, { reason })).data;
/** The export holds personal data and is behind the bearer token, so it is fetched and saved from memory rather than linked. */
export const downloadSchoolExport = async (schoolId: string) => {
  const res = await officeHttp.get<Blob>(`schools/${schoolId}/export`, { responseType: "blob" });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement("a");
  a.href = url;
  a.download = `school-export-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};
export const latestErasure = async (schoolId: string) => (await officeHttp.get<DeletionRequest | null>(`schools/${schoolId}/erasure`)).data;
export const requestErasure = async (schoolId: string, reason: string) => (await officeHttp.post<DeletionRequest>(`schools/${schoolId}/erasure`, { reason })).data;
export const withdrawErasure = async (requestId: string) => (await officeHttp.delete<DeletionRequest>(`erasure-requests/${requestId}`)).data;
export const decideErasure = async (requestId: string, approve: boolean, note: string | null) => (await officeHttp.post<DeletionRequest>(`erasure-requests/${requestId}/decision`, { approve, note })).data;
