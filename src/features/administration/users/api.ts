import { mockDelay } from "@/utils/mockDelay";
import type { DeviceRecord, SessionRecord } from "@/features/authentication/types";
import { buildDevicesForUser, buildLoginHistoryForUser, buildSessionsForUser, SEED_USERS } from "./mock";
import type { LoginHistoryEntry, SystemUser, UserFormValues, UserPreferences, UserStatus } from "./types";

const STORAGE_KEY = "sms-mock-users";

function loadUsers(): SystemUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to seed data
  }
  return SEED_USERS.map((u) => ({ ...u }));
}

function saveUsers(users: SystemUser[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
  } catch {
    // best-effort only
  }
}

let users = loadUsers();

function nextId(): string {
  const max = users.reduce((acc, u) => Math.max(acc, Number(u.id.replace("usr-", "")) || 0), 1000);
  return `usr-${max + 1}`;
}

export async function listUsers(): Promise<SystemUser[]> {
  return mockDelay([...users], 400);
}

export async function createUser(values: UserFormValues): Promise<SystemUser> {
  if (users.some((u) => u.email.toLowerCase() === values.email.trim().toLowerCase())) {
    await mockDelay(null, 400);
    throw new Error("A user with this email already exists");
  }
  const user: SystemUser = {
    id: nextId(),
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone?.trim(),
    roleId: values.roleId,
    department: values.department?.trim(),
    status: "active",
    avatarUrl: null,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
    mfaEnabled: false,
    preferences: { theme: "system", language: "en", emailNotifications: true, smsNotifications: false },
  };
  users = [user, ...users];
  saveUsers(users);
  return mockDelay(user, 400);
}

export async function updateUser(id: string, values: UserFormValues): Promise<SystemUser> {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("User not found");
  }
  if (users.some((u) => u.id !== id && u.email.toLowerCase() === values.email.trim().toLowerCase())) {
    await mockDelay(null, 400);
    throw new Error("A user with this email already exists");
  }
  const updated: SystemUser = {
    ...users[idx],
    name: values.name.trim(),
    email: values.email.trim(),
    phone: values.phone?.trim(),
    roleId: values.roleId,
    department: values.department?.trim(),
  };
  users = users.map((u) => (u.id === id ? updated : u));
  saveUsers(users);
  return mockDelay(updated, 400);
}

export async function deleteUser(id: string): Promise<void> {
  users = users.filter((u) => u.id !== id);
  saveUsers(users);
  await mockDelay(null, 400);
}

export async function setUserStatus(id: string, status: UserStatus): Promise<SystemUser> {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("User not found");
  }
  const updated = { ...users[idx], status };
  users = users.map((u) => (u.id === id ? updated : u));
  saveUsers(users);
  return mockDelay(updated, 350);
}

export async function resetUserPassword(id: string): Promise<{ tempPassword: string }> {
  const user = users.find((u) => u.id === id);
  if (!user) {
    await mockDelay(null, 300);
    throw new Error("User not found");
  }
  const tempPassword = Math.random().toString(36).slice(2, 10);
  console.info(`[mock] Temporary password for ${user.email}: ${tempPassword}`);
  return mockDelay({ tempPassword }, 500);
}

export async function updateUserPreferences(id: string, preferences: UserPreferences): Promise<SystemUser> {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("User not found");
  }
  const updated = { ...users[idx], preferences };
  users = users.map((u) => (u.id === id ? updated : u));
  saveUsers(users);
  return mockDelay(updated, 350);
}

export async function updateUserAvatar(id: string, avatarUrl: string | null): Promise<SystemUser> {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("User not found");
  }
  const updated = { ...users[idx], avatarUrl };
  users = users.map((u) => (u.id === id ? updated : u));
  saveUsers(users);
  return mockDelay(updated, 350);
}

export async function setUserMfaEnabled(id: string, mfaEnabled: boolean): Promise<SystemUser> {
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("User not found");
  }
  const updated = { ...users[idx], mfaEnabled };
  users = users.map((u) => (u.id === id ? updated : u));
  saveUsers(users);
  return mockDelay(updated, 350);
}

async function requireUser(id: string): Promise<SystemUser> {
  const user = users.find((u) => u.id === id);
  if (!user) {
    await mockDelay(null, 300);
    throw new Error("User not found");
  }
  return user;
}

export async function listUserLoginHistory(id: string): Promise<LoginHistoryEntry[]> {
  const user = await requireUser(id);
  return mockDelay(buildLoginHistoryForUser(user), 400);
}

export async function listUserSessions(id: string): Promise<SessionRecord[]> {
  const user = await requireUser(id);
  return mockDelay(buildSessionsForUser(user), 400);
}

export async function revokeUserSession(_id: string, _sessionId: string): Promise<{ message: string }> {
  return mockDelay({ message: "Session signed out" }, 400);
}

export async function listUserDevices(id: string): Promise<DeviceRecord[]> {
  const user = await requireUser(id);
  return mockDelay(buildDevicesForUser(user), 400);
}

export async function revokeUserDevice(_id: string, _deviceId: string): Promise<{ message: string }> {
  return mockDelay({ message: "Device removed" }, 400);
}
