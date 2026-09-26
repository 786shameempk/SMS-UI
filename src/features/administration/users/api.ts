import { authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type { DeviceRecord, SessionRecord } from "@/features/authentication/types";
import type { LoginHistoryEntry, SystemUser, UserFormValues, UserPreferences, UserStatus } from "./types";

// Real AuthService-backed (/api/school-users): the same Identity users that sign in, scoped
// server-side to the active tenant and (for branch-locked views) the active branch plus the
// tenant's all-branch users.

interface ApiSchoolUser {
  id: string;
  tenantId: string | null;
  branchId: string | null;
  name: string;
  email: string;
  phone: string | null;
  roleId: string | null;
  roleKey: string | null;
  department: string | null;
  status: UserStatus;
  avatarUrl: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  mfaEnabled: boolean;
  preferences: UserPreferences;
}

interface ApiUserSession {
  id: string;
  device: string;
  browser: string;
  ipAddress: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

interface ApiDevice {
  id: string;
  name: string;
  type: DeviceRecord["type"];
  os: string;
  firstSeenAt: string;
  lastUsedAt: string;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

const mapUser = (dto: ApiSchoolUser): SystemUser => ({
  id: dto.id,
  tenantId: dto.tenantId ?? "",
  branchId: dto.branchId,
  name: dto.name,
  email: dto.email,
  phone: dto.phone ?? undefined,
  roleId: dto.roleId ?? "",
  department: dto.department ?? undefined,
  status: dto.status,
  avatarUrl: dto.avatarUrl,
  createdAt: dto.createdAt,
  lastLoginAt: dto.lastLoginAt,
  mfaEnabled: dto.mfaEnabled,
  preferences: dto.preferences,
});

/** Shared with the signed-in user's own security screen (authentication/api.ts). */
export const mapSession = (dto: ApiUserSession): SessionRecord => ({
  id: dto.id,
  device: dto.device,
  browser: dto.browser,
  location: "—",
  ipAddress: dto.ipAddress,
  lastActiveAt: dto.createdAt,
  isCurrent: dto.isCurrent,
});

export const mapDevice = (dto: ApiDevice): DeviceRecord => ({
  id: dto.id,
  name: dto.name,
  type: dto.type,
  os: dto.os,
  trustedAt: dto.firstSeenAt,
  lastUsedAt: dto.lastUsedAt,
});

export type { ApiDevice, ApiUserSession };

const toRequest = (values: UserFormValues) => ({
  branchId: values.branchId,
  name: values.name,
  email: values.email,
  phone: values.phone || null,
  roleId: values.roleId,
  department: values.department || null,
});

const base = "/api/school-users";

export async function listUsers(): Promise<SystemUser[]> {
  return (await unwrap(authHttpClient.get<ApiSchoolUser[]>(base))).map(mapUser);
}

/** The temporary password is emailed too, but email delivery is optional, so it's returned for the admin to hand over. */
export async function createUser(values: UserFormValues): Promise<{ user: SystemUser; tempPassword: string }> {
  const result = await unwrap(
    authHttpClient.post<{ user: ApiSchoolUser; temporaryPassword: string }>(base, toRequest(values)),
  );
  return { user: mapUser(result.user), tempPassword: result.temporaryPassword };
}

export async function updateUser(id: string, values: UserFormValues): Promise<SystemUser> {
  return mapUser(await unwrap(authHttpClient.put<ApiSchoolUser>(`${base}/${id}`, toRequest(values))));
}

export async function deleteUser(id: string): Promise<void> {
  await unwrap(authHttpClient.delete<void>(`${base}/${id}`));
}

export async function setUserStatus(id: string, status: UserStatus): Promise<SystemUser> {
  return mapUser(await unwrap(authHttpClient.put<ApiSchoolUser>(`${base}/${id}/status`, { status })));
}

export async function resetUserPassword(id: string): Promise<{ tempPassword: string }> {
  return unwrap(authHttpClient.post<{ tempPassword: string }>(`${base}/${id}/reset-password`));
}

export async function updateUserPreferences(id: string, preferences: UserPreferences): Promise<SystemUser> {
  return mapUser(await unwrap(authHttpClient.put<ApiSchoolUser>(`${base}/${id}/preferences`, preferences)));
}

export async function updateUserAvatar(id: string, avatarUrl: string | null): Promise<SystemUser> {
  return mapUser(await unwrap(authHttpClient.put<ApiSchoolUser>(`${base}/${id}/avatar`, { avatarUrl })));
}

export async function setUserMfaEnabled(id: string, mfaEnabled: boolean): Promise<SystemUser> {
  return mapUser(await unwrap(authHttpClient.put<ApiSchoolUser>(`${base}/${id}/mfa`, { mfaEnabled })));
}

export async function listUserLoginHistory(id: string): Promise<LoginHistoryEntry[]> {
  const rows = await unwrap(
    authHttpClient.get<Array<Omit<LoginHistoryEntry, "location">>>(`${base}/${id}/login-history`),
  );
  return rows.map((r) => ({ ...r, location: "—" }));
}

export async function listUserSessions(id: string): Promise<SessionRecord[]> {
  return (await unwrap(authHttpClient.get<ApiUserSession[]>(`${base}/${id}/sessions`))).map(mapSession);
}

export async function revokeUserSession(id: string, sessionId: string): Promise<{ message: string }> {
  await unwrap(authHttpClient.delete<void>(`${base}/${id}/sessions/${sessionId}`));
  return { message: "Session signed out" };
}

export async function listUserDevices(id: string): Promise<DeviceRecord[]> {
  return (await unwrap(authHttpClient.get<ApiDevice[]>(`${base}/${id}/devices`))).map(mapDevice);
}

export async function revokeUserDevice(id: string, deviceId: string): Promise<{ message: string }> {
  await unwrap(authHttpClient.delete<void>(`${base}/${id}/devices/${deviceId}`));
  return { message: "Device signed out" };
}
