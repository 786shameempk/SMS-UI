export type UserRole =
  | "superAdmin"
  | "admin"
  | "principal"
  | "teacher"
  | "accountant"
  | "librarian"
  | "receptionist"
  | "parent"
  | "student";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
}

/** Coarse-grained module visibility flags, refined into per-action permissions by the Role & Permission module. */
export interface ModulePermissions {
  dashboard: boolean;
  students: boolean;
  academics: boolean;
  attendance: boolean;
  staff: boolean;
  teachers: boolean;
  fees: boolean;
  library: boolean;
  transport: boolean;
  hostel: boolean;
  administration: boolean;
  timetable: boolean;
  examinations: boolean;
  homework: boolean;
  [module: string]: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface MfaChallenge {
  required: boolean;
  method?: "totp" | "email" | "sms";
  destination?: string;
}
