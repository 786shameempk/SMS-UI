import type { AuthUser, ModulePermissions, UserRole } from "@/types/auth";

interface MockAccount {
  user: AuthUser;
  password: string;
  mfaEnabled: boolean;
}

const FULL_PERMISSIONS: ModulePermissions = {
  dashboard: true,
  students: true,
  staff: true,
  fees: true,
  library: true,
  transport: true,
  hostel: true,
  administration: true,
  parentPortal: false,
};

const permissionsForRole = (role: UserRole): ModulePermissions => {
  if (role === "parent" || role === "student") {
    return {
      ...FULL_PERMISSIONS,
      staff: false,
      students: false,
      fees: role === "parent",
      administration: false,
      parentPortal: role === "parent",
    };
  }
  if (role === "teacher") {
    return { ...FULL_PERMISSIONS, staff: false, administration: false };
  }
  return FULL_PERMISSIONS;
};

export const MOCK_ACCOUNTS: MockAccount[] = [
  {
    password: "admin123",
    mfaEnabled: true,
    user: { id: "u-1001", name: "Ava Whitfield", email: "admin@educore.dev", role: "admin", avatarUrl: null },
  },
  {
    password: "teacher123",
    mfaEnabled: false,
    user: { id: "u-1002", name: "Daniel Reyes", email: "teacher@educore.dev", role: "teacher", avatarUrl: null },
  },
  {
    password: "parent123",
    mfaEnabled: false,
    user: { id: "u-1003", name: "Priya Nair", email: "parent@educore.dev", role: "parent", avatarUrl: null },
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
