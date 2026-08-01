import type { AuthUser, LoginCredentials, ModulePermissions } from "@/types/auth";
import { mockDelay } from "@/utils/mockDelay";
import { findAccount, findAccountByEmail, permissionsFor, setAccountPassword } from "./mockUsers";
import { buildMockDevices, buildMockSessions } from "./mockSecurity";
import type { DeviceRecord, SessionRecord } from "./types";

export interface LoginResult {
  user: AuthUser;
  token: string;
  permissions: ModulePermissions;
}

export type LoginOutcome = { status: "mfa_required"; email: string } | ({ status: "success" } & LoginResult);

const MOCK_MFA_CODE = "123456";

/** Mirrored to localStorage since a reset link is always opened via a fresh page load. */
const RESET_TOKENS_KEY = "sms-mock-reset-tokens";

function loadResetTokens(): Record<string, string> {
  try {
    const raw = localStorage.getItem(RESET_TOKENS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveResetTokens(tokens: Record<string, string>) {
  try {
    localStorage.setItem(RESET_TOKENS_KEY, JSON.stringify(tokens));
  } catch {
    // best-effort only
  }
}

const resetTokens = loadResetTokens();

function makeMockToken(user: AuthUser): string {
  const payload = { sub: user.id, role: user.role, iat: Date.now() };
  return `mock.${btoa(JSON.stringify(payload))}.token`;
}

function buildLoginResult(account: NonNullable<ReturnType<typeof findAccount>>): LoginResult {
  return {
    user: account.user,
    token: makeMockToken(account.user),
    permissions: permissionsFor(account.user.role),
  };
}

export async function login(credentials: LoginCredentials): Promise<LoginOutcome> {
  const account = findAccount(credentials.email, credentials.password);
  if (!account) {
    await mockDelay(null, 500);
    throw new Error("Invalid email or password");
  }
  if (account.mfaEnabled) {
    await mockDelay(null, 400);
    return { status: "mfa_required", email: account.user.email };
  }
  const result = await mockDelay(buildLoginResult(account), 500);
  return { status: "success", ...result };
}

export async function verifyMfaCode(email: string, code: string): Promise<LoginResult> {
  const account = findAccountByEmail(email);
  if (!account) {
    await mockDelay(null, 400);
    throw new Error("Session expired, please sign in again");
  }
  if (code.trim() !== MOCK_MFA_CODE) {
    await mockDelay(null, 500);
    throw new Error("Incorrect verification code");
  }
  return mockDelay(buildLoginResult(account), 500);
}

export async function requestPasswordReset(email: string): Promise<{ message: string }> {
  const account = findAccountByEmail(email);
  if (account) {
    const token = Math.random().toString(36).slice(2, 10);
    resetTokens[token] = account.user.email;
    saveResetTokens(resetTokens);
    // In a real backend this token would be emailed to the user, not returned to the client.
    console.info(`[mock] Password reset link: /reset-password?token=${token}`);
  }
  return mockDelay({ message: "If that email is registered, a reset link has been sent." }, 600);
}

export async function resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
  const email = resetTokens[token];
  if (!email) {
    await mockDelay(null, 400);
    throw new Error("This reset link is invalid or has expired");
  }
  setAccountPassword(email, newPassword);
  delete resetTokens[token];
  saveResetTokens(resetTokens);
  return mockDelay({ message: "Your password has been reset" }, 500);
}

export async function changePassword(
  email: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  const account = findAccount(email, currentPassword);
  if (!account) {
    await mockDelay(null, 400);
    throw new Error("Current password is incorrect");
  }
  setAccountPassword(email, newPassword);
  return mockDelay({ message: "Password updated successfully" }, 500);
}

export async function listSessions(): Promise<SessionRecord[]> {
  return mockDelay(buildMockSessions(), 400);
}

export async function revokeSession(_sessionId: string): Promise<{ message: string }> {
  return mockDelay({ message: "Session signed out" }, 400);
}

export async function listDevices(): Promise<DeviceRecord[]> {
  return mockDelay(buildMockDevices(), 400);
}

export async function revokeDevice(_deviceId: string): Promise<{ message: string }> {
  return mockDelay({ message: "Device removed" }, 400);
}
