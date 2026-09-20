import { mockDelay } from "@/utils/mockDelay";
import { listStaff } from "@/features/staff/api";
import { listStudents } from "@/features/students/api";
import { buildSeedAnnouncements, buildSeedPlans, buildSeedTenants } from "./mock";
import type { Announcement, AnnouncementFormValues, Plan, PlanFormValues, Tenant, TenantFormValues, TenantRow, PlatformReportsSummary } from "./types";

const TENANTS_KEY = "sms-mock-platform-tenants";
const PLANS_KEY = "sms-mock-platform-plans";
const ANNOUNCEMENTS_KEY = "sms-mock-platform-announcements";
const SEEDED_KEY = "sms-mock-platform-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let tenants = loadJson<Tenant[]>(TENANTS_KEY, []);
let plans = loadJson<Plan[]>(PLANS_KEY, []);
let announcements = loadJson<Announcement[]>(ANNOUNCEMENTS_KEY, []);

function persistTenants() {
  saveJson(TENANTS_KEY, tenants);
}
function persistPlans() {
  saveJson(PLANS_KEY, plans);
}
function persistAnnouncements() {
  saveJson(ANNOUNCEMENTS_KEY, announcements);
}

function requireTenant(id: string): Tenant {
  const found = tenants.find((t) => t.id === id);
  if (!found) throw new Error("Tenant not found");
  return found;
}

function requirePlan(id: string): Plan {
  const found = plans.find((p) => p.id === id);
  if (!found) throw new Error("Plan not found");
  return found;
}

/**
 * This app has no real multi-tenant data isolation — every other module's localStorage is
 * one shared dataset for the single school running here. This console is the platform-team
 * layer *on top of* that: it manages a tenant registry, plan catalog, and announcements as
 * this module's own data, and is honest about the fact that only one seeded tenant
 * (`isCurrentEnvironment: true`) reflects this app's real student/staff counts — the rest are
 * illustrative fictional schools with their own seed stats, not real separate datasets.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  if (plans.length === 0) {
    plans = buildSeedPlans();
    persistPlans();
  }
  if (tenants.length === 0) {
    tenants = buildSeedTenants();
    persistTenants();
  }
  if (announcements.length === 0) {
    announcements = buildSeedAnnouncements();
    persistAnnouncements();
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Platform console seed failed", err);
});

async function toRow(tenant: Tenant, planById: Map<string, Plan>): Promise<TenantRow> {
  const plan = planById.get(tenant.planId) ?? requirePlan(tenant.planId);
  if (tenant.isCurrentEnvironment) {
    const [students, staff] = await Promise.all([listStudents(), listStaff()]);
    return { ...tenant, plan, studentCount: students.length, staffCount: staff.length, storageUsedGb: tenant.seedStorageUsedGb ?? 2 };
  }
  return { ...tenant, plan, studentCount: tenant.seedStudentCount ?? 0, staffCount: tenant.seedStaffCount ?? 0, storageUsedGb: tenant.seedStorageUsedGb ?? 0 };
}

// ── Tenants ──────────────────────────────────────────────────────────────

export async function listTenants(): Promise<TenantRow[]> {
  await seedPromise;
  const planById = new Map(plans.map((p) => [p.id, p] as const));
  const rows = await Promise.all(tenants.map((t) => toRow(t, planById)));
  rows.sort((a, b) => (b.isCurrentEnvironment ? 1 : 0) - (a.isCurrentEnvironment ? 1 : 0) || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return mockDelay(rows, 350);
}

export async function createTenant(values: TenantFormValues): Promise<Tenant> {
  await seedPromise;
  if (tenants.some((t) => t.subdomain.toLowerCase() === values.subdomain.toLowerCase())) {
    throw new Error("A tenant with this subdomain already exists");
  }
  const tenant: Tenant = {
    id: genId("tenant"),
    schoolName: values.schoolName,
    subdomain: values.subdomain.toLowerCase(),
    status: "trial",
    planId: values.planId,
    billingContactName: values.billingContactName,
    billingContactEmail: values.billingContactEmail,
    createdAt: new Date().toISOString(),
    isCurrentEnvironment: false,
    seedStudentCount: 0,
    seedStaffCount: 0,
    seedStorageUsedGb: 0,
  };
  tenants = [...tenants, tenant];
  persistTenants();
  return mockDelay(tenant, 400);
}

export async function updateTenantPlan(id: string, planId: string): Promise<Tenant> {
  await seedPromise;
  requireTenant(id);
  requirePlan(planId);
  const updated = tenants.map((t) => (t.id === id ? { ...t, planId } : t));
  tenants = updated;
  persistTenants();
  return mockDelay(requireTenant(id), 300);
}

export async function activateTenant(id: string): Promise<Tenant> {
  await seedPromise;
  const tenant = requireTenant(id);
  if (tenant.status === "cancelled") throw new Error("A cancelled tenant can't be reactivated — create a new tenant instead");
  const updated: Tenant = { ...tenant, status: "active" };
  tenants = tenants.map((t) => (t.id === id ? updated : t));
  persistTenants();
  return mockDelay(updated, 300);
}

export async function suspendTenant(id: string): Promise<Tenant> {
  await seedPromise;
  const tenant = requireTenant(id);
  if (tenant.isCurrentEnvironment) throw new Error("Can't suspend the tenant this environment is running as");
  if (tenant.status !== "active") throw new Error("Only an active tenant can be suspended");
  const updated: Tenant = { ...tenant, status: "suspended" };
  tenants = tenants.map((t) => (t.id === id ? updated : t));
  persistTenants();
  return mockDelay(updated, 300);
}

export async function cancelTenant(id: string): Promise<Tenant> {
  await seedPromise;
  const tenant = requireTenant(id);
  if (tenant.isCurrentEnvironment) throw new Error("Can't cancel the tenant this environment is running as");
  const updated: Tenant = { ...tenant, status: "cancelled" };
  tenants = tenants.map((t) => (t.id === id ? updated : t));
  persistTenants();
  return mockDelay(updated, 300);
}

export async function deleteTenant(id: string): Promise<void> {
  await seedPromise;
  const tenant = requireTenant(id);
  if (tenant.isCurrentEnvironment) throw new Error("Can't delete the tenant this environment is running as");
  tenants = tenants.filter((t) => t.id !== id);
  persistTenants();
  return mockDelay(undefined, 300);
}

// ── Plans ────────────────────────────────────────────────────────────────

export async function listPlans(): Promise<Plan[]> {
  await seedPromise;
  return mockDelay([...plans].sort((a, b) => a.monthlyPriceInr - b.monthlyPriceInr), 300);
}

export async function createPlan(values: PlanFormValues): Promise<Plan> {
  await seedPromise;
  const plan: Plan = { id: genId("plan"), ...values };
  plans = [...plans, plan];
  persistPlans();
  return mockDelay(plan, 400);
}

export async function updatePlan(id: string, values: PlanFormValues): Promise<Plan> {
  await seedPromise;
  requirePlan(id);
  const updated: Plan = { id, ...values };
  plans = plans.map((p) => (p.id === id ? updated : p));
  persistPlans();
  return mockDelay(updated, 350);
}

export async function deletePlan(id: string): Promise<void> {
  await seedPromise;
  requirePlan(id);
  if (tenants.some((t) => t.planId === id)) throw new Error("Can't delete a plan that tenants are currently subscribed to");
  plans = plans.filter((p) => p.id !== id);
  persistPlans();
  return mockDelay(undefined, 300);
}

// ── Announcements ────────────────────────────────────────────────────────

export async function listAnnouncements(): Promise<Announcement[]> {
  await seedPromise;
  return mockDelay(
    [...announcements].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    300,
  );
}

export async function createAnnouncement(values: AnnouncementFormValues): Promise<Announcement> {
  await seedPromise;
  const announcement: Announcement = { id: genId("announce"), active: true, createdAt: new Date().toISOString(), ...values };
  announcements = [announcement, ...announcements];
  persistAnnouncements();
  return mockDelay(announcement, 400);
}

export async function toggleAnnouncementActive(id: string): Promise<Announcement> {
  await seedPromise;
  const found = announcements.find((a) => a.id === id);
  if (!found) throw new Error("Announcement not found");
  const updated: Announcement = { ...found, active: !found.active };
  announcements = announcements.map((a) => (a.id === id ? updated : a));
  persistAnnouncements();
  return mockDelay(updated, 300);
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await seedPromise;
  const found = announcements.find((a) => a.id === id);
  if (!found) throw new Error("Announcement not found");
  announcements = announcements.filter((a) => a.id !== id);
  persistAnnouncements();
  return mockDelay(undefined, 300);
}

// ── Reports ────────────────────────────────────────────────────────────

export async function getPlatformReportsSummary(): Promise<PlatformReportsSummary> {
  await seedPromise;
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

  return mockDelay(
    { totalTenants, activeTenants, trialTenants, suspendedTenants, cancelledTenants, mrrInr, totalStudentsAcrossTenants, totalStaffAcrossTenants, tenantsByPlan },
    350,
  );
}
