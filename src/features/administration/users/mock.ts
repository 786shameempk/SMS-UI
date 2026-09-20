import { DEFAULT_TENANT_ID, defaultBranchIdForTenant } from "@/utils/tenant";
import type { DeviceRecord, SessionRecord } from "@/features/authentication/types";
import type { LoginHistoryEntry, LoginOutcome, SystemUser } from "./types";

const DEFAULT_BRANCH_ID = defaultBranchIdForTenant(DEFAULT_TENANT_ID);

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

const DEFAULT_PREFERENCES = {
  theme: "system" as const,
  language: "en" as const,
  emailNotifications: true,
  smsNotifications: false,
};

export const SEED_USERS: Omit<SystemUser, "tenantId">[] = [
  {
    id: "usr-1001",
    branchId: null,
    name: "Ava Whitfield",
    email: "admin@educore.dev",
    phone: "+91 98450 11223",
    roleId: "role-admin",
    department: "Administration",
    status: "active",
    avatarUrl: null,
    createdAt: daysAgo(400),
    lastLoginAt: daysAgo(0),
    mfaEnabled: true,
    preferences: { ...DEFAULT_PREFERENCES },
  },
  {
    id: "usr-1002",
    branchId: DEFAULT_BRANCH_ID,
    name: "Daniel Reyes",
    email: "teacher@educore.dev",
    phone: "+91 98450 22334",
    roleId: "role-teacher",
    department: "Mathematics",
    status: "active",
    avatarUrl: null,
    createdAt: daysAgo(320),
    lastLoginAt: daysAgo(0),
    mfaEnabled: true,
    preferences: { ...DEFAULT_PREFERENCES, theme: "light" },
  },
  {
    id: "usr-1003",
    branchId: DEFAULT_BRANCH_ID,
    name: "Priya Nair",
    email: "parent@educore.dev",
    phone: "+91 98450 33445",
    roleId: "role-receptionist",
    department: "Front Office",
    status: "active",
    avatarUrl: null,
    createdAt: daysAgo(280),
    lastLoginAt: daysAgo(1),
    mfaEnabled: false,
    preferences: { ...DEFAULT_PREFERENCES },
  },
  {
    id: "usr-1004",
    branchId: DEFAULT_BRANCH_ID,
    name: "Meera Iyer",
    email: "meera.iyer@educore.dev",
    phone: "+91 98450 44556",
    roleId: "role-principal",
    department: "Administration",
    status: "active",
    avatarUrl: null,
    createdAt: daysAgo(500),
    lastLoginAt: daysAgo(2),
    mfaEnabled: true,
    preferences: { ...DEFAULT_PREFERENCES },
  },
  {
    id: "usr-1005",
    branchId: DEFAULT_BRANCH_ID,
    name: "Rohan Kulkarni",
    email: "rohan.kulkarni@educore.dev",
    phone: "+91 98450 55667",
    roleId: "role-accountant",
    department: "Finance",
    status: "active",
    avatarUrl: null,
    createdAt: daysAgo(210),
    lastLoginAt: daysAgo(4),
    mfaEnabled: false,
    preferences: { ...DEFAULT_PREFERENCES },
  },
  {
    id: "usr-1006",
    branchId: DEFAULT_BRANCH_ID,
    name: "Fatima Sheikh",
    email: "fatima.sheikh@educore.dev",
    phone: "+91 98450 66778",
    roleId: "role-librarian",
    department: "Library",
    status: "inactive",
    avatarUrl: null,
    createdAt: daysAgo(150),
    lastLoginAt: daysAgo(45),
    mfaEnabled: false,
    preferences: { ...DEFAULT_PREFERENCES },
  },
  {
    id: "usr-1007",
    branchId: DEFAULT_BRANCH_ID,
    name: "James Carter",
    email: "james.carter@educore.dev",
    phone: "+91 98450 77889",
    roleId: "role-teacher",
    department: "Science",
    status: "locked",
    avatarUrl: null,
    createdAt: daysAgo(190),
    lastLoginAt: daysAgo(30),
    mfaEnabled: false,
    preferences: { ...DEFAULT_PREFERENCES },
  },
  {
    id: "usr-1008",
    branchId: DEFAULT_BRANCH_ID,
    name: "Neha Gupta",
    email: "neha.gupta@educore.dev",
    phone: "+91 98450 88990",
    roleId: "role-teacher",
    department: "English",
    status: "active",
    avatarUrl: null,
    createdAt: daysAgo(95),
    lastLoginAt: daysAgo(0),
    mfaEnabled: true,
    preferences: { ...DEFAULT_PREFERENCES },
  },
];

/** Deterministic pseudo-random seed derived from a user id, so repeated views of the same
 * user's security data stay stable instead of reshuffling on every dialog open. */
function seedFromId(id: string): number {
  return id.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

const BROWSERS = ["Chrome 129 on Windows", "Safari on iOS 18", "Firefox 131 on macOS", "Edge 128 on Windows", "Chrome on Android 14"];
const LOCATIONS = ["Bengaluru, IN", "Chennai, IN", "Mumbai, IN", "Hyderabad, IN", "Pune, IN"];
const DEVICE_LABELS = ["This device", "iPhone", "MacBook Pro", "Android phone", "Office desktop"];

export function buildLoginHistoryForUser(user: SystemUser): LoginHistoryEntry[] {
  const seed = seedFromId(user.id);
  const entryCount = 4 + (seed % 4);
  const entries: LoginHistoryEntry[] = [];

  for (let i = 0; i < entryCount; i++) {
    const daysBack = i === 0 ? 0 : i * (1 + ((seed + i) % 3));
    const isFailure = i > 0 && (seed + i) % 5 === 0;
    const outcome: LoginOutcome = isFailure ? (i % 2 === 0 ? "failed_password" : "failed_mfa") : "success";
    entries.push({
      id: `${user.id}-login-${i}`,
      at: daysAgo(daysBack),
      outcome,
      device: DEVICE_LABELS[(seed + i) % DEVICE_LABELS.length],
      browser: BROWSERS[(seed + i) % BROWSERS.length],
      ipAddress: `203.0.113.${(seed + i * 7) % 255}`,
      location: LOCATIONS[(seed + i) % LOCATIONS.length],
    });
  }
  return entries;
}

export function buildSessionsForUser(user: SystemUser): SessionRecord[] {
  if (user.status !== "active") return [];
  const seed = seedFromId(user.id);
  const count = 1 + (seed % 3);
  return Array.from({ length: count }, (_, i) => ({
    id: `${user.id}-sess-${i}`,
    device: DEVICE_LABELS[(seed + i) % DEVICE_LABELS.length],
    browser: BROWSERS[(seed + i) % BROWSERS.length],
    location: LOCATIONS[(seed + i) % LOCATIONS.length],
    ipAddress: `203.0.113.${(seed + i * 11) % 255}`,
    lastActiveAt: daysAgo(i === 0 ? 0 : i),
    isCurrent: false,
  }));
}

const DEVICE_KINDS: Array<{ label: string; type: DeviceRecord["type"]; os: string }> = [
  { label: "Laptop", type: "desktop", os: "Windows 11" },
  { label: "iPhone", type: "mobile", os: "iOS 18" },
  { label: "MacBook Pro", type: "desktop", os: "macOS" },
  { label: "Android phone", type: "mobile", os: "Android 14" },
  { label: "iPad", type: "tablet", os: "iPadOS 18" },
];

export function buildDevicesForUser(user: SystemUser): DeviceRecord[] {
  if (user.status !== "active") return [];
  const seed = seedFromId(user.id);
  const count = 1 + (seed % 2);
  return Array.from({ length: count }, (_, i) => {
    const kind = DEVICE_KINDS[(seed + i + 1) % DEVICE_KINDS.length];
    return {
      id: `${user.id}-dev-${i}`,
      name: `${user.name.split(" ")[0]}'s ${kind.label}`,
      type: kind.type,
      os: kind.os,
      trustedAt: daysAgo(30 + i * 20),
      lastUsedAt: daysAgo(i),
    };
  });
}
