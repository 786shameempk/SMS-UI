import { academicHttpClient, authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import type {
  Announcement,
  AnnouncementFormValues,
  Plan,
  PlanFormValues,
  PlanTier,
  PlatformReportsSummary,
  Tenant,
  TenantFormValues,
  TenantRow,
  TenantStatus,
} from "./types";

// Real AuthService-backed (/api/platform): the tenant registry, plan catalog and announcements.
// Per-tenant student/staff headcounts come from AcademicService's SuperAdmin-only stats endpoint.

interface ApiTenant {
  id: string;
  schoolName: string;
  subdomain: string;
  status: "Trial" | "Active" | "Suspended" | "Cancelled";
  planId: string;
  billingContactName: string;
  billingContactEmail: string;
  createdAt: string;
}

interface ApiPlan extends Omit<Plan, "tier"> {
  tier: "Starter" | "Growth" | "Enterprise";
}

interface ApiAnnouncement {
  id: string;
  title: string;
  body: string;
  active: boolean;
  createdAt: string;
  expiresAt: string | null;
}

interface ApiTenantCounts {
  tenantId: string;
  studentCount: number;
  staffCount: number;
}

const TENANT_STATUS_FROM_API: Record<ApiTenant["status"], TenantStatus> = {
  Trial: "trial",
  Active: "active",
  Suspended: "suspended",
  Cancelled: "cancelled",
};
const TENANT_STATUS_TO_API: Record<TenantStatus, ApiTenant["status"]> = {
  trial: "Trial",
  active: "Active",
  suspended: "Suspended",
  cancelled: "Cancelled",
};
const TIER_TO_API: Record<PlanTier, ApiPlan["tier"]> = { starter: "Starter", growth: "Growth", enterprise: "Enterprise" };
const TIER_FROM_API: Record<ApiPlan["tier"], PlanTier> = { Starter: "starter", Growth: "growth", Enterprise: "enterprise" };

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

/** The tenant the SuperAdmin currently has selected in the header switcher - protected from suspend/cancel/delete. */
const activeTenantId = () => useAuthStore.getState().activeTenantId;

const mapTenant = (dto: ApiTenant): Tenant => ({
  id: dto.id,
  schoolName: dto.schoolName,
  subdomain: dto.subdomain,
  status: TENANT_STATUS_FROM_API[dto.status],
  planId: dto.planId,
  billingContactName: dto.billingContactName,
  billingContactEmail: dto.billingContactEmail,
  createdAt: dto.createdAt,
  isCurrentEnvironment: dto.id === activeTenantId(),
});

const mapPlan = (dto: ApiPlan): Plan => ({ ...dto, tier: TIER_FROM_API[dto.tier] });
const toPlanRequest = (values: PlanFormValues) => ({ ...values, tier: TIER_TO_API[values.tier] });

const mapAnnouncement = (dto: ApiAnnouncement): Announcement => ({
  id: dto.id,
  title: dto.title,
  body: dto.body,
  active: dto.active,
  createdAt: dto.createdAt,
  expiresAt: dto.expiresAt ?? undefined,
});

const setStatus = async (id: string, status: TenantStatus): Promise<Tenant> =>
  mapTenant(await unwrap(authHttpClient.put<ApiTenant>(`/api/platform/tenants/${id}/status`, { status: TENANT_STATUS_TO_API[status] })));

// ── Tenants ──────────────────────────────────────────────────────────────

export async function listTenants(): Promise<TenantRow[]> {
  const [tenants, plans, counts] = await Promise.all([
    unwrap(authHttpClient.get<ApiTenant[]>("/api/platform/tenants")),
    listPlans(),
    unwrap(academicHttpClient.get<ApiTenantCounts[]>("/api/stats/tenant-counts")),
  ]);
  const planById = new Map(plans.map((p) => [p.id, p] as const));
  const countsByTenant = new Map(counts.map((c) => [c.tenantId, c] as const));

  const rows: TenantRow[] = [];
  for (const dto of tenants) {
    const plan = planById.get(dto.planId);
    if (!plan) continue;
    const tenant = mapTenant(dto);
    const c = countsByTenant.get(tenant.id);
    // No per-tenant storage metering exists yet, so usage isn't reported (the UI shows the plan quota).
    rows.push({ ...tenant, plan, studentCount: c?.studentCount ?? 0, staffCount: c?.staffCount ?? 0, storageUsedGb: 0 });
  }
  rows.sort(
    (a, b) =>
      (b.isCurrentEnvironment ? 1 : 0) - (a.isCurrentEnvironment ? 1 : 0) ||
      new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  return rows;
}

export async function createTenant(values: TenantFormValues): Promise<Tenant> {
  return mapTenant(await unwrap(authHttpClient.post<ApiTenant>("/api/platform/tenants", values)));
}

export async function updateTenantPlan(id: string, planId: string): Promise<Tenant> {
  return mapTenant(await unwrap(authHttpClient.put<ApiTenant>(`/api/platform/tenants/${id}/plan`, { planId })));
}

export async function activateTenant(id: string): Promise<Tenant> {
  return setStatus(id, "active");
}

export async function suspendTenant(id: string): Promise<Tenant> {
  if (id === activeTenantId()) throw new Error("Switch to another tenant before suspending the one you're viewing");
  return setStatus(id, "suspended");
}

export async function cancelTenant(id: string): Promise<Tenant> {
  if (id === activeTenantId()) throw new Error("Switch to another tenant before cancelling the one you're viewing");
  return setStatus(id, "cancelled");
}

export async function deleteTenant(id: string): Promise<void> {
  if (id === activeTenantId()) throw new Error("Switch to another tenant before deleting the one you're viewing");
  await unwrap(authHttpClient.delete<void>(`/api/platform/tenants/${id}`));
}

// ── Plans ────────────────────────────────────────────────────────────────

export async function listPlans(): Promise<Plan[]> {
  return (await unwrap(authHttpClient.get<ApiPlan[]>("/api/platform/plans"))).map(mapPlan);
}

export async function createPlan(values: PlanFormValues): Promise<Plan> {
  return mapPlan(await unwrap(authHttpClient.post<ApiPlan>("/api/platform/plans", toPlanRequest(values))));
}

export async function updatePlan(id: string, values: PlanFormValues): Promise<Plan> {
  return mapPlan(await unwrap(authHttpClient.put<ApiPlan>(`/api/platform/plans/${id}`, toPlanRequest(values))));
}

export async function deletePlan(id: string): Promise<void> {
  await unwrap(authHttpClient.delete<void>(`/api/platform/plans/${id}`));
}

// ── Announcements ────────────────────────────────────────────────────────

export async function listAnnouncements(): Promise<Announcement[]> {
  return (await unwrap(authHttpClient.get<ApiAnnouncement[]>("/api/platform/announcements"))).map(mapAnnouncement);
}

export async function createAnnouncement(values: AnnouncementFormValues): Promise<Announcement> {
  return mapAnnouncement(
    await unwrap(
      authHttpClient.post<ApiAnnouncement>("/api/platform/announcements", {
        title: values.title,
        body: values.body,
        expiresAt: values.expiresAt ? values.expiresAt.slice(0, 10) : null,
      }),
    ),
  );
}

export async function toggleAnnouncementActive(id: string): Promise<Announcement> {
  return mapAnnouncement(await unwrap(authHttpClient.post<ApiAnnouncement>(`/api/platform/announcements/${id}/toggle`)));
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await unwrap(authHttpClient.delete<void>(`/api/platform/announcements/${id}`));
}

// ── Reports ────────────────────────────────────────────────────────────
// Aggregated client-side from the real tenant list.

export async function getPlatformReportsSummary(): Promise<PlatformReportsSummary> {
  const rows = await listTenants();

  const totalTenants = rows.length;
  const activeTenants = rows.filter((t) => t.status === "active").length;
  const trialTenants = rows.filter((t) => t.status === "trial").length;
  const suspendedTenants = rows.filter((t) => t.status === "suspended").length;
  const cancelledTenants = rows.filter((t) => t.status === "cancelled").length;

  const mrrInr = rows.filter((t) => t.status === "active" || t.status === "trial").reduce((sum, t) => sum + t.plan.monthlyPriceInr, 0);
  const totalStudentsAcrossTenants = rows.reduce((sum, t) => sum + t.studentCount, 0);
  const totalStaffAcrossTenants = rows.reduce((sum, t) => sum + t.staffCount, 0);

  const planCounts = new Map<string, { planName: string; count: number }>();
  for (const row of rows) {
    const existing = planCounts.get(row.planId);
    planCounts.set(row.planId, { planName: row.plan.name, count: (existing?.count ?? 0) + 1 });
  }
  const tenantsByPlan = Array.from(planCounts.entries()).map(([planId, v]) => ({ planId, planName: v.planName, count: v.count }));

  return { totalTenants, activeTenants, trialTenants, suspendedTenants, cancelledTenants, mrrInr, totalStudentsAcrossTenants, totalStaffAcrossTenants, tenantsByPlan };
}
