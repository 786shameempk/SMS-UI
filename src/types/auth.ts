export type UserRole =
  | "superAdmin"
  | "admin"
  | "principal"
  | "teacher"
  | "accountant"
  | "librarian"
  | "receptionist"
  | "parent"
  | "student"
  /** A school's custom role (Roles & Permissions): what it may open comes from its module permissions. */
  | "staff";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatarUrl?: string | null;
  /** Every user belongs to exactly one tenant, except superAdmin (null), who can view any of them. */
  tenantId: string | null;
  /** The branch (campus) the user is locked to; null for users whose role covers every branch. */
  branchId: string | null;
  /** The user's role has "All branches" (Admin, or any custom role set that way): they switch branch in
   *  the header instead of being locked to one. Based on the role's setting, never its name. */
  allBranchAccess: boolean;
}

/** Sessions saved before allBranchAccess existed: an all-branch user was one without a branch. */
export function hasAllBranchAccess(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.allBranchAccess ?? (user.branchId === null && user.tenantId !== null);
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
