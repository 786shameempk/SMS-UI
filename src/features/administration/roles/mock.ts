import type { FeatureToggle, Permission, PermissionCategory, Policy, Role, RolePermissionMap } from "./types";

const DAY_MS = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY_MS).toISOString();

export const SEED_ROLES: Omit<Role, "tenantId">[] = [
  { id: "role-admin", name: "Administrator", description: "Full access to every module and setting.", isSystem: true, grantsAllBranchAccess: true, createdAt: daysAgo(500) },
  { id: "role-principal", name: "Principal", description: "Oversight across academics, staff, and finance.", isSystem: true, grantsAllBranchAccess: false, createdAt: daysAgo(500) },
  { id: "role-teacher", name: "Teacher", description: "Manages classes, attendance, and grading.", isSystem: true, grantsAllBranchAccess: false, createdAt: daysAgo(500) },
  { id: "role-accountant", name: "Accountant", description: "Manages fees, invoices, and financial reports.", isSystem: true, grantsAllBranchAccess: false, createdAt: daysAgo(500) },
  { id: "role-librarian", name: "Librarian", description: "Manages the library catalog and book circulation.", isSystem: true, grantsAllBranchAccess: false, createdAt: daysAgo(500) },
  { id: "role-receptionist", name: "Receptionist", description: "Front-office visitor and enquiry management.", isSystem: true, grantsAllBranchAccess: false, createdAt: daysAgo(500) },
  { id: "role-exam-coordinator", name: "Exam Coordinator", description: "Custom role for scheduling and publishing exam results.", isSystem: false, grantsAllBranchAccess: false, createdAt: daysAgo(60) },
];

export const PERMISSION_MODULES = [
  "Dashboard",
  "User Management",
  "Role & Permissions",
  "Students",
  "Attendance",
  "Examinations",
  "Fees",
  "Library",
] as const;

export const CATEGORY_LABEL: Record<PermissionCategory, string> = {
  menu: "Menu",
  api: "API",
  screen: "Screen",
  action: "Action",
};

export const CATEGORY_DESCRIPTION: Record<PermissionCategory, string> = {
  menu: "Controls whether the module's nav item and pages are visible.",
  api: "Controls whether the role's requests to this module's endpoints are authorized.",
  screen: "Controls access to detail/record screens within the module.",
  action: "Controls create, edit, and delete actions within the module.",
};

function buildPermissions(): Permission[] {
  const categories: PermissionCategory[] = ["menu", "api", "screen", "action"];
  return PERMISSION_MODULES.flatMap((module) =>
    categories.map((category) => ({
      id: `perm-${module.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${category}`,
      label: `${module} — ${CATEGORY_LABEL[category]}`,
      module,
      category,
    })),
  );
}

export const SEED_PERMISSIONS: Permission[] = buildPermissions();

function grant(module: string, categories: PermissionCategory[]): string[] {
  const key = module.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return categories.map((c) => `perm-${key}-${c}`);
}

export const SEED_ROLE_PERMISSIONS: RolePermissionMap = {
  "role-admin": SEED_PERMISSIONS.map((p) => p.id),
  "role-principal": [
    ...grant("Dashboard", ["menu", "api", "screen", "action"]),
    ...grant("User Management", ["menu", "api", "screen"]),
    ...grant("Role & Permissions", ["menu", "screen"]),
    ...grant("Students", ["menu", "api", "screen", "action"]),
    ...grant("Attendance", ["menu", "api", "screen"]),
    ...grant("Examinations", ["menu", "api", "screen", "action"]),
    ...grant("Fees", ["menu", "api", "screen"]),
    ...grant("Library", ["menu", "screen"]),
  ],
  "role-teacher": [
    ...grant("Dashboard", ["menu", "api", "screen"]),
    ...grant("Students", ["menu", "api", "screen"]),
    ...grant("Attendance", ["menu", "api", "screen", "action"]),
    ...grant("Examinations", ["menu", "screen"]),
    ...grant("Library", ["menu"]),
  ],
  "role-accountant": [...grant("Dashboard", ["menu", "api", "screen"]), ...grant("Fees", ["menu", "api", "screen", "action"])],
  "role-librarian": [...grant("Dashboard", ["menu"]), ...grant("Library", ["menu", "api", "screen", "action"])],
  "role-receptionist": [...grant("Dashboard", ["menu"]), ...grant("Students", ["menu", "screen"])],
  "role-exam-coordinator": [...grant("Dashboard", ["menu"]), ...grant("Examinations", ["menu", "api", "screen", "action"])],
};

export const SEED_POLICIES: Omit<Policy, "tenantId">[] = [
  {
    id: "pol-1",
    name: "Class-scoped grading",
    description: "Teachers may only enter or edit exam marks for classes they are assigned to teach.",
    module: "Examinations",
    condition: "resource.classTeacherId == user.id",
    roleIds: ["role-teacher"],
    enabled: true,
  },
  {
    id: "pol-2",
    name: "Department-scoped fee approval",
    description: "Accountants can approve fee waivers only within their own department's students.",
    module: "Fees",
    condition: "resource.department == user.department",
    roleIds: ["role-accountant"],
    enabled: true,
  },
  {
    id: "pol-3",
    name: "Self-service profile edits",
    description: "Any signed-in user may edit their own profile fields, regardless of module permissions.",
    module: "User Management",
    condition: "resource.userId == user.id",
    roleIds: ["role-admin", "role-principal", "role-teacher", "role-accountant", "role-librarian", "role-receptionist"],
    enabled: true,
  },
  {
    id: "pol-4",
    name: "Exam result publish window",
    description: "Exam coordinators can publish results only within 48 hours of the exam end date.",
    module: "Examinations",
    condition: "now() - resource.examEndDate <= 48h",
    roleIds: ["role-exam-coordinator"],
    enabled: false,
  },
];

export const SEED_FEATURE_TOGGLES: Omit<FeatureToggle, "tenantId">[] = [
  { id: "ft-1", key: "biometric_attendance", label: "Biometric attendance", description: "Enable fingerprint/RFID attendance devices.", module: "Attendance", enabled: true },
  { id: "ft-2", key: "gps_transport_tracking", label: "GPS transport tracking", description: "Live bus location tracking for parents.", module: "Transport", enabled: true },
  { id: "ft-3", key: "online_classes", label: "Online classes", description: "Zoom/Meet/Teams integration for remote lessons.", module: "Online Classes", enabled: false },
  { id: "ft-4", key: "ai_chatbot", label: "AI chatbot assistant", description: "AI-powered assistant for parents and staff.", module: "AI Features", enabled: false },
  { id: "ft-5", key: "whatsapp_notifications", label: "WhatsApp notifications", description: "Send fee and attendance alerts via WhatsApp.", module: "Communication", enabled: false },
  { id: "ft-6", key: "enforce_mfa", label: "Enforce multi-factor authentication", description: "Require MFA for all administrator accounts.", module: "Authentication", enabled: true },
];
