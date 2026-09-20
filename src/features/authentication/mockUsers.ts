import type { AuthUser, ModulePermissions, UserRole } from "@/types/auth";
import { DEFAULT_TENANT_ID, defaultBranchIdForTenant } from "@/utils/tenant";

const DEFAULT_BRANCH_ID = defaultBranchIdForTenant(DEFAULT_TENANT_ID);

interface MockAccount {
  user: AuthUser;
  password: string;
  mfaEnabled: boolean;
}

const FULL_PERMISSIONS: ModulePermissions = {
  dashboard: true,
  students: true,
  academics: true,
  attendance: true,
  staff: true,
  teachers: true,
  payroll: true,
  fees: true,
  accounting: true,
  inventory: true,
  certificates: true,
  health: true,
  visitors: true,
  helpdesk: true,
  surveys: true,
  library: true,
  transport: true,
  hostel: true,
  communication: true,
  reports: true,
  administration: true,
  platformConsole: false,
  aiFeatures: true,
  parentPortal: false,
  timetable: true,
  examinations: true,
  homework: true,
};

/** Fee/Accounting/Payroll/Inventory/Certificates/Health/Visitors/HelpDesk/Surveys/Library/Transport/Hostel/Communication/Reports/AI Features are restricted to admin users only. */
const ADMIN_ONLY_MODULES = [
  "fees",
  "accounting",
  "payroll",
  "inventory",
  "certificates",
  "health",
  "visitors",
  "helpdesk",
  "surveys",
  "library",
  "transport",
  "hostel",
  "communication",
  "reports",
  "aiFeatures",
] as const satisfies ReadonlyArray<keyof ModulePermissions>;

const permissionsForRole = (role: UserRole): ModulePermissions => {
  const isAdmin = role === "admin" || role === "superAdmin";
  const adminOnlyOverrides = Object.fromEntries(ADMIN_ONLY_MODULES.map((key) => [key, isAdmin])) as Record<(typeof ADMIN_ONLY_MODULES)[number], boolean>;
  /** Unlike every other admin-only module, the Platform Console is superAdmin-only — a regular
   *  admin manages their own school, not the multi-tenant SaaS layer above it. This is the
   *  first thing in the app that actually distinguishes the two roles' permissions. */
  const platformConsole = role === "superAdmin";

  if (role === "parent" || role === "student") {
    return {
      ...FULL_PERMISSIONS,
      ...adminOnlyOverrides,
      staff: false,
      students: false,
      administration: false,
      platformConsole,
      parentPortal: role === "parent",
    };
  }
  if (role === "teacher") {
    return { ...FULL_PERMISSIONS, ...adminOnlyOverrides, staff: false, administration: false, platformConsole };
  }
  return { ...FULL_PERMISSIONS, ...adminOnlyOverrides, platformConsole };
};

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    password: "superadmin123",
    mfaEnabled: true,
    user: { id: "u-1000", name: "Nikhil Shetty", email: "superadmin@educore.dev", role: "superAdmin", avatarUrl: null, tenantId: null, branchId: null },
  },
  {
    password: "admin123",
    mfaEnabled: true,
    user: { id: "u-1001", name: "Ava Whitfield", email: "admin@educore.dev", role: "admin", avatarUrl: null, tenantId: DEFAULT_TENANT_ID, branchId: null },
  },
  {
    password: "teacher123",
    mfaEnabled: false,
    user: { id: "u-1002", name: "Daniel Reyes", email: "teacher@educore.dev", role: "teacher", avatarUrl: null, tenantId: DEFAULT_TENANT_ID, branchId: DEFAULT_BRANCH_ID },
  },
  {
    password: "parent123",
    mfaEnabled: false,
    user: { id: "u-1003", name: "Priya Nair", email: "parent@educore.dev", role: "parent", avatarUrl: null, tenantId: DEFAULT_TENANT_ID, branchId: DEFAULT_BRANCH_ID },
  },
  /**
   * A real, fully-scoped user of a *second* tenant — purely so isolation is demonstrable by
   * logging in as an actual account, not only via superAdmin's switcher. Riverside has no seed
   * data of its own (see PROGRESS.md), so this account should see a genuinely empty app.
   */
  {
    password: "riverside123",
    mfaEnabled: false,
    user: { id: "u-1004", name: "Meredith Okafor", email: "riverside-admin@educore.dev", role: "admin", avatarUrl: null, tenantId: "tenant-riverside", branchId: null },
  },
];

/**
 * The mock account list above lives in JS memory and resets on every full page load,
 * but password-reset links always arrive via a fresh navigation in real life. Password
 * overrides are mirrored to localStorage so "change password" / "reset password" survive reloads.
 */
const PASSWORD_OVERRIDES_KEY = "sms-mock-password-overrides";

function loadPasswordOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(PASSWORD_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePasswordOverrides(overrides: Record<string, string>) {
  try {
    localStorage.setItem(PASSWORD_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // best-effort only; falling back to in-memory state is fine
  }
}

const passwordOverrides = loadPasswordOverrides();

function passwordOf(account: MockAccount): string {
  return passwordOverrides[account.user.email.toLowerCase()] ?? account.password;
}

export function findAccount(email: string, password: string): MockAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return MOCK_ACCOUNTS.find((a) => a.user.email.toLowerCase() === normalized && passwordOf(a) === password);
}

export function findAccountByEmail(email: string): MockAccount | undefined {
  const normalized = email.trim().toLowerCase();
  return MOCK_ACCOUNTS.find((a) => a.user.email.toLowerCase() === normalized);
}

export function findAccountById(id: string): MockAccount | undefined {
  return MOCK_ACCOUNTS.find((a) => a.user.id === id);
}

export function setAccountPassword(email: string, newPassword: string): boolean {
  const account = findAccountByEmail(email);
  if (!account) return false;
  passwordOverrides[account.user.email.toLowerCase()] = newPassword;
  savePasswordOverrides(passwordOverrides);
  return true;
}

export function permissionsFor(role: UserRole): ModulePermissions {
  return permissionsForRole(role);
}
