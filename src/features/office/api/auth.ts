import { officeHttp, withCsrf } from "./http";
import type { MfaEnrollment, OfficeAuthResult, OfficeUser } from "../types";

export const officeLogin = async (email: string, password: string) =>
  (await officeHttp.post<OfficeAuthResult>("auth/login", { email: email.trim(), password })).data;

export const verifyMfa = async (challengeToken: string, code: string) =>
  (await officeHttp.post<OfficeAuthResult>("auth/mfa/verify", { challengeToken, code })).data;

export const changeRequiredPassword = async (challengeToken: string, newPassword: string) =>
  (await officeHttp.post<OfficeAuthResult>("auth/password/change-required", { challengeToken, newPassword })).data;

export const beginMfaSetupFromChallenge = async (challengeToken: string) =>
  (await officeHttp.post<MfaEnrollment>("auth/mfa/setup/begin", { challengeToken })).data;

export const confirmMfaSetupFromChallenge = async (challengeToken: string, code: string) =>
  (await officeHttp.post<OfficeAuthResult>("auth/mfa/setup/confirm", { challengeToken, code })).data;

export const requestPasswordReset = async (email: string) => {
  await officeHttp.post("auth/password/forgot", { email: email.trim() });
};

export const resetPassword = async (token: string, newPassword: string) => {
  await officeHttp.post("auth/password/reset", { token, newPassword });
};

export const acceptInvite = async (token: string, newPassword: string) => {
  await officeHttp.post("auth/invite/accept", { token, newPassword });
};

export const getMe = async () => (await officeHttp.get<OfficeUser>("auth/me")).data;

export const changeOwnPassword = async (currentPassword: string, newPassword: string) => {
  await officeHttp.post("auth/password/change", { currentPassword, newPassword });
};

export const beginMfaEnrollment = async () => (await officeHttp.post<MfaEnrollment>("auth/mfa/enroll/begin")).data;

export const confirmMfaEnrollment = async (code: string) => {
  await officeHttp.post("auth/mfa/enroll/confirm", { code });
};

export const disableMfa = async (password: string, code: string) => {
  await officeHttp.post("auth/mfa/disable", { password, code });
};

export const logoutEverywhere = async () => {
  await officeHttp.post("auth/logout-all", null, withCsrf);
};
