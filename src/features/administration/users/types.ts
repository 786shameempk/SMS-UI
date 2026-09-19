export type UserStatus = "active" | "inactive" | "locked";

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: "en" | "de" | "hi";
  emailNotifications: boolean;
  smsNotifications: boolean;
}

export interface SystemUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  department?: string;
  status: UserStatus;
  avatarUrl?: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  mfaEnabled: boolean;
  preferences: UserPreferences;
}

export type LoginOutcome = "success" | "failed_password" | "failed_mfa";

export interface LoginHistoryEntry {
  id: string;
  at: string;
  outcome: LoginOutcome;
  device: string;
  browser: string;
  ipAddress: string;
  location: string;
}

export interface UserFormValues {
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  department?: string;
}
