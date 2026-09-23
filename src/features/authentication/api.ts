import type { AuthUser, LoginCredentials, ModulePermissions, UserRole } from "@/types/auth";
import { authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { mapDevice, mapSession, type ApiDevice, type ApiUserSession } from "@/features/administration/users/api";
import type { DeviceRecord, SessionRecord } from "./types";

export interface LoginResult {
  user: AuthUser;
  token: string;
  permissions: ModulePermissions;
}

/** Shape of AuthService's UserDto (see AuthService.Application/DTO/UserDto.cs). */
interface ApiUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  tenantId: string | null;
  branchId: string | null;
  roles: string[];
  permissions: string[];
}

/** Shape of AuthService's AuthResponseDto (see AuthService.Application/DTO/AuthResponseDto.cs). */
interface ApiAuthResponseDto {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
  user: ApiUserDto;
}

const VALID_ROLES: UserRole[] = [
  "superAdmin",
  "admin",
  "principal",
  "teacher",
  "accountant",
  "librarian",
  "receptionist",
  "parent",
  "student",
];

/** AuthService's Identity role names are meant to match UserRole exactly (see AuthService's
 *  Domain/Constants/Roles.cs), matched case-insensitively to tolerate any legacy/manually-cased
 *  role rows in the database. Falls back to the least-privileged role if nothing recognizable. */
function mapRole(roles: string[]): UserRole {
  for (const role of roles) {
    const match = VALID_ROLES.find((v) => v.toLowerCase() === role.toLowerCase());
    if (match) return match;
  }
  return "student";
}

const MODULE_PERMISSION_PREFIX = "module.";

/** AuthService issues one "module.<key>" permission per ModulePermissions key (see Domain/Constants
 *  Permissions.Modules), so the key is recovered by stripping the prefix - no translation table. */
function mapModulePermissions(permissions: string[]): ModulePermissions {
  const result: ModulePermissions = {
    dashboard: false,
    students: false,
    academics: false,
    attendance: false,
    staff: false,
    teachers: false,
    payroll: false,
    fees: false,
    accounting: false,
    inventory: false,
    certificates: false,
    health: false,
    visitors: false,
    helpdesk: false,
    surveys: false,
    library: false,
    transport: false,
    hostel: false,
    communication: false,
    reports: false,
    administration: false,
    platformConsole: false,
    aiFeatures: false,
    timetable: false,
    examinations: false,
    homework: false,
  };
  for (const permission of permissions) {
    if (permission.startsWith(MODULE_PERMISSION_PREFIX)) {
      result[permission.slice(MODULE_PERMISSION_PREFIX.length)] = true;
    }
  }
  return result;
}

function mapAuthUser(dto: ApiUserDto): AuthUser {
  return {
    id: dto.id,
    name: `${dto.firstName} ${dto.lastName}`.trim(),
    email: dto.email,
    role: mapRole(dto.roles),
    avatarUrl: null,
    tenantId: dto.tenantId,
    branchId: dto.branchId,
  };
}

export async function login(credentials: LoginCredentials): Promise<LoginResult> {
  try {
    const { data } = await authHttpClient.post<ApiAuthResponseDto>("/api/auth/login", {
      email: credentials.email,
      password: credentials.password,
    });
    return {
      user: mapAuthUser(data.user),
      token: data.accessToken,
      permissions: mapModulePermissions(data.user.permissions),
    };
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, "Invalid email or password"));
  }
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  try {
    await authHttpClient.post("/api/auth/forgot-password", { email });
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
  return { message: "If that email is registered, a reset link has been sent." };
}

export async function resetPassword(email: string, token: string, newPassword: string): Promise<{ message: string }> {
  try {
    await authHttpClient.post("/api/auth/reset-password", { email, token, newPassword });
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, "This reset link is invalid or has expired"));
  }
  return { message: "Your password has been reset" };
}

/** The signed-in user's own password (the server identifies them from the token, so `_email` is unused). */
export async function changePassword(
  _email: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  try {
    await authHttpClient.post("/api/auth/change-password", { currentPassword, newPassword });
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, "Current password is incorrect"));
  }
  return { message: "Password updated successfully" };
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export async function listSessions(): Promise<SessionRecord[]> {
  return (await unwrap(authHttpClient.get<ApiUserSession[]>("/api/account/sessions"))).map(mapSession);
}

export async function revokeSession(sessionId: string): Promise<{ message: string }> {
  await unwrap(authHttpClient.delete<void>(`/api/account/sessions/${sessionId}`));
  return { message: "Session signed out" };
}

export async function listDevices(): Promise<DeviceRecord[]> {
  return (await unwrap(authHttpClient.get<ApiDevice[]>("/api/account/devices"))).map(mapDevice);
}

export async function revokeDevice(deviceId: string): Promise<{ message: string }> {
  await unwrap(authHttpClient.delete<void>(`/api/account/devices/${deviceId}`));
  return { message: "Device signed out" };
}
