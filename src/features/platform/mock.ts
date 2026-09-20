import { DEFAULT_TENANT_ID } from "@/utils/tenant";
import { AVAILABLE_MODULE_LABELS } from "./constants";
import type { Announcement, Plan, Tenant } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY_MS).toISOString();

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

const STARTER_MODULES = AVAILABLE_MODULE_LABELS.slice(0, 8);
const GROWTH_MODULES = AVAILABLE_MODULE_LABELS.slice(0, 16);
const ENTERPRISE_MODULES = [...AVAILABLE_MODULE_LABELS];

export function buildSeedPlans(): Plan[] {
  return [
    {
      id: "plan-starter",
      tier: "starter",
      name: "Starter",
      monthlyPriceInr: 15000,
      maxStudents: 300,
      maxStaff: 30,
      storageGb: 10,
      includedModules: STARTER_MODULES,
    },
    {
      id: "plan-growth",
      tier: "growth",
      name: "Growth",
      monthlyPriceInr: 35000,
      maxStudents: 1000,
      maxStaff: 100,
      storageGb: 50,
      includedModules: GROWTH_MODULES,
    },
    {
      id: "plan-enterprise",
      tier: "enterprise",
      name: "Enterprise",
      monthlyPriceInr: 75000,
      maxStudents: 10000,
      maxStaff: 500,
      storageGb: 200,
      includedModules: ENTERPRISE_MODULES,
    },
  ];
}

/**
 * Only the first tenant here (`isCurrentEnvironment: true`) is backed by this app's real
 * student/staff data — everything else in this module is a genuinely separate school with no
 * data of its own, so the other five tenants carry their own fictional seed counts instead of
 * pretending to read from students/staff that don't exist for them.
 */
export function buildSeedTenants(): Tenant[] {
  return [
    {
      id: DEFAULT_TENANT_ID,
      schoolName: "EduCore School",
      subdomain: "educore",
      status: "active",
      planId: "plan-growth",
      billingContactName: "Ava Whitfield",
      billingContactEmail: "admin@educore.dev",
      createdAt: daysAgo(400),
      isCurrentEnvironment: true,
    },
    {
      id: "tenant-riverside",
      schoolName: "Riverside International School",
      subdomain: "riverside-intl",
      status: "active",
      planId: "plan-enterprise",
      billingContactName: "Meredith Okafor",
      billingContactEmail: "billing@riverside-intl.example",
      createdAt: daysAgo(310),
      isCurrentEnvironment: false,
      seedStudentCount: 3120,
      seedStaffCount: 240,
      seedStorageUsedGb: 118,
    },
    {
      id: "tenant-greenfield",
      schoolName: "Greenfield Academy",
      subdomain: "greenfield-academy",
      status: "trial",
      planId: "plan-starter",
      billingContactName: "Tomás Herrera",
      billingContactEmail: "tomas.herrera@greenfield.example",
      createdAt: daysAgo(9),
      isCurrentEnvironment: false,
      seedStudentCount: 64,
      seedStaffCount: 8,
      seedStorageUsedGb: 1,
    },
    {
      id: "tenant-sunrise",
      schoolName: "Sunrise Public School",
      subdomain: "sunrise-public",
      status: "active",
      planId: "plan-starter",
      billingContactName: "Latika Bose",
      billingContactEmail: "accounts@sunrisepublic.example",
      createdAt: daysAgo(210),
      isCurrentEnvironment: false,
      seedStudentCount: 245,
      seedStaffCount: 22,
      seedStorageUsedGb: 6,
    },
    {
      id: "tenant-oakwood",
      schoolName: "Oakwood Grammar School",
      subdomain: "oakwood-grammar",
      status: "suspended",
      planId: "plan-growth",
      billingContactName: "Peter Nkosi",
      billingContactEmail: "peter.nkosi@oakwoodgrammar.example",
      createdAt: daysAgo(260),
      isCurrentEnvironment: false,
      seedStudentCount: 610,
      seedStaffCount: 58,
      seedStorageUsedGb: 22,
    },
    {
      id: "tenant-bluebell",
      schoolName: "Bluebell Elementary",
      subdomain: "bluebell-elementary",
      status: "active",
      planId: "plan-starter",
      billingContactName: "Hannah Wiese",
      billingContactEmail: "hannah@bluebellschool.example",
      createdAt: daysAgo(75),
      isCurrentEnvironment: false,
      seedStudentCount: 180,
      seedStaffCount: 15,
      seedStorageUsedGb: 4,
    },
  ];
}

export function buildSeedAnnouncements(): Announcement[] {
  return [
    {
      id: genId("announce"),
      title: "Scheduled maintenance this weekend",
      body: "The platform will be briefly unavailable for routine maintenance between 1–2 AM IST on Saturday. No action is needed on your end.",
      active: true,
      createdAt: daysAgo(3),
      expiresAt: daysFromNow(4),
    },
    {
      id: genId("announce"),
      title: "New: Certificate Generator now available",
      body: "Growth and Enterprise tenants now have access to the new Certificate Generator module — bonafide, transfer, character, and staff service certificates, all issued from real student/staff records.",
      active: true,
      createdAt: daysAgo(14),
    },
  ];
}
