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
  /** Every user belongs to exactly one tenant, except superAdmin (null), who can view any of them. */
  tenantId: string | null;
  /** Every user belongs to exactly one branch (campus) within their tenant, except admin/superAdmin
   *  (null), who aren't locked to one branch and can switch between their tenant's branches. */
  branchId: string | null;
}

/** Coarse-grained module visibility flags, refined into per-action permissions by the Role & Permission module. */
export interface ModulePermissions {
  dashboard: boolean;
  students: boolean;
  academics: boolean;
  attendance: boolean;
  staff: boolean;
  teachers: boolean;
  payroll: boolean;
  fees: boolean;
  accounting: boolean;
  inventory: boolean;
  certificates: boolean;
  health: boolean;
  visitors: boolean;
  helpdesk: boolean;
  surveys: boolean;
  library: boolean;
  transport: boolean;
  hostel: boolean;
  communication: boolean;
  reports: boolean;
  administration: boolean;
  platformConsole: boolean;
  aiFeatures: boolean;
  timetable: boolean;
  examinations: boolean;
  homework: boolean;
  talents: boolean;
  meetings: boolean;
  studyMaterials: boolean;
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
