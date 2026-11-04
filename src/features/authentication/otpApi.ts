import { authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { getTenantSubdomain } from "@/lib/tenantHost";
import i18n from "@/i18n";
import { toLoginResult, type ApiAuthResponseDto, type LoginResult } from "./api";

// Sign-in (and number verification) with a one-time code sent by SMS or email - see AuthService's AuthController.

export type OtpChannel = "email" | "mobile";

export interface AuthMethods {
  password: boolean;
  otpEmail: boolean;
  otpMobile: boolean;
}

const PASSWORD_ONLY: AuthMethods = { password: true, otpEmail: false, otpMobile: false };

/** Which sign-in methods the server offers. Any failure means "password only": the code options must never get in the way of signing in. */
export async function getAuthMethods(): Promise<AuthMethods> {
  try {
    const { data } = await authHttpClient.get<AuthMethods>("/api/auth/methods", { params: { subdomain: getTenantSubdomain() } });
    return { password: true, otpEmail: data.otpEmail === true, otpMobile: data.otpMobile === true };
  } catch {
    return PASSWORD_ONLY;
  }
}

export interface OtpChallenge {
  challengeId: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  /** The destination partly hidden, computed by the server from what was typed (the same whether or not an account exists). */
  maskedDestination: string;
}

export interface OtpAccountChoice {
  userId: string;
  displayName: string;
  schoolName: string;
  roleLabel: string;
}

export type OtpVerifyResult =
  | { kind: "session"; session: LoginResult }
  | { kind: "select"; selectionToken: string; accounts: OtpAccountChoice[] };

interface ApiSelectAccount {
  status: "select_account";
  selectionToken: string;
  accounts: OtpAccountChoice[];
}

async function call<T>(request: Promise<{ data: T }>, fallback: string): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err, fallback));
  }
}

const couldNot = (what: string) => i18n.t(what, { ns: "authentication" });

export function requestOtp(channel: OtpChannel, destination: string): Promise<OtpChallenge> {
  return call(
    authHttpClient.post<OtpChallenge>("/api/auth/otp/request", { channel, destination: destination.trim(), subdomain: getTenantSubdomain() }),
    couldNot("We couldn't send a code. Please try again."),
  );
}

export function resendOtp(challengeId: string): Promise<OtpChallenge> {
  return call(authHttpClient.post<OtpChallenge>("/api/auth/otp/resend", { challengeId }), couldNot("We couldn't send a new code. Please try again."));
}

export async function verifyOtp(challengeId: string, code: string): Promise<OtpVerifyResult> {
  const data = await call(
    authHttpClient.post<ApiAuthResponseDto | ApiSelectAccount>("/api/auth/otp/verify", { challengeId, code, subdomain: getTenantSubdomain() }),
    couldNot("We couldn't check that code. Please try again."),
  );
  return "status" in data && data.status === "select_account"
    ? { kind: "select", selectionToken: data.selectionToken, accounts: data.accounts }
    : { kind: "session", session: toLoginResult(data as ApiAuthResponseDto) };
}

export async function selectOtpAccount(selectionToken: string, userId: string): Promise<LoginResult> {
  const data = await call(
    authHttpClient.post<ApiAuthResponseDto>("/api/auth/otp/select", { selectionToken, userId, subdomain: getTenantSubdomain() }),
    couldNot("We couldn't sign you in. Please start again."),
  );
  return toLoginResult(data);
}

export interface PhoneStatus {
  maskedPhone: string | null;
  confirmed: boolean;
  otpEnabled: boolean;
}

export function getPhoneStatus(): Promise<PhoneStatus> {
  return call(authHttpClient.get<PhoneStatus>("/api/auth/phone"), couldNot("We couldn't load your mobile number."));
}

export function requestPhoneVerification(phoneNumber: string): Promise<OtpChallenge> {
  return call(authHttpClient.post<OtpChallenge>("/api/auth/phone/request", { phoneNumber: phoneNumber.trim() }), couldNot("We couldn't send a code. Please try again."));
}

export async function verifyPhone(challengeId: string, code: string): Promise<void> {
  await call(authHttpClient.post<void>("/api/auth/phone/verify", { challengeId, code }), couldNot("We couldn't check that code. Please try again."));
}
