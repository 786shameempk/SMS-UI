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
  preferences: UserPreferences;
}

export interface UserFormValues {
  name: string;
  email: string;
  phone?: string;
  roleId: string;
  department?: string;
}
