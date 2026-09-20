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

/**
 * Mirrors the app's actual sidebar (see `constants/nav.ts`), one row per distinct
 * permission-gated destination, so this matrix never drifts from what a role can actually
 * see in the nav — kept in the same top-to-bottom order as the sidebar for that reason.
 * "My Homework" isn't a separate row: it shares the same `homework` permission key as
 * "Homework" in `ModulePermissions`, so one row already covers both nav entries.
 */
export const PERMISSION_MODULES = [
  "Dashboard",
  "Notifications",
  "Calendar",
  "Parent Portal",
  "Students",
  "Academic Setup",
  "Attendance",
  "Teachers",
  "Timetable",
  "Examinations",
  "Homework",
  "Staff Management",
  "Payroll",
  "Fee Management",
  "Accounting",
  "Inventory Management",
  "Certificate Generator",
  "Health & Medical",
  "Visitor Management",
  "Complaint / Help Desk",
  "Surveys & Feedback",
  "Library Management",
  "Transport Management",
  "Hostel Management",
  "Communication Center",
  "Reports & Analytics",
  "AI Features",
  "User Management",
  "Roles & Permissions",
  "Branch Management",
  "Settings",
  "Platform Console",
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
    ...grant("Notifications", ["menu", "api", "screen"]),
    ...grant("Calendar", ["menu", "api", "screen"]),
    ...grant("Students", ["menu", "api", "screen", "action"]),
    ...grant("Academic Setup", ["menu", "api", "screen", "action"]),
    ...grant("Attendance", ["menu", "api", "screen"]),
    ...grant("Teachers", ["menu", "api", "screen", "action"]),
    ...grant("Timetable", ["menu", "api", "screen"]),
    ...grant("Examinations", ["menu", "api", "screen", "action"]),
    ...grant("Homework", ["menu", "screen"]),
    ...grant("Staff Management", ["menu", "api", "screen", "action"]),
    ...grant("Payroll", ["menu", "screen"]),
    ...grant("Fee Management", ["menu", "api", "screen"]),
    ...grant("Accounting", ["menu", "screen"]),
    ...grant("Certificate Generator", ["menu", "screen", "action"]),
    ...grant("Health & Medical", ["menu", "screen"]),
    ...grant("Visitor Management", ["menu", "screen"]),
    ...grant("Complaint / Help Desk", ["menu", "screen"]),
    ...grant("Surveys & Feedback", ["menu", "screen"]),
    ...grant("Library Management", ["menu", "screen"]),
    ...grant("Transport Management", ["menu", "screen"]),
    ...grant("Hostel Management", ["menu", "screen"]),
    ...grant("Communication Center", ["menu", "api", "screen"]),
    ...grant("Reports & Analytics", ["menu", "api", "screen"]),
    ...grant("AI Features", ["menu", "screen"]),
    ...grant("User Management", ["menu", "api", "screen"]),
    ...grant("Roles & Permissions", ["menu", "screen"]),
    ...grant("Branch Management", ["menu", "screen"]),
    ...grant("Settings", ["menu", "screen"]),
  ],
  "role-teacher": [
    ...grant("Dashboard", ["menu", "api", "screen"]),
    ...grant("Notifications", ["menu", "screen"]),
    ...grant("Calendar", ["menu", "screen"]),
    ...grant("Students", ["menu", "api", "screen"]),
    ...grant("Academic Setup", ["menu", "screen"]),
    ...grant("Attendance", ["menu", "api", "screen", "action"]),
    ...grant("Teachers", ["menu", "screen"]),
    ...grant("Timetable", ["menu", "screen"]),
    ...grant("Examinations", ["menu", "api", "screen", "action"]),
    ...grant("Homework", ["menu", "api", "screen", "action"]),
    ...grant("Library Management", ["menu"]),
  ],
  "role-accountant": [
    ...grant("Dashboard", ["menu", "api", "screen"]),
    ...grant("Notifications", ["menu", "screen"]),
    ...grant("Fee Management", ["menu", "api", "screen", "action"]),
    ...grant("Accounting", ["menu", "api", "screen", "action"]),
    ...grant("Payroll", ["menu", "api", "screen"]),
    ...grant("Reports & Analytics", ["menu", "screen"]),
  ],
  "role-librarian": [
    ...grant("Dashboard", ["menu"]),
    ...grant("Notifications", ["menu"]),
    ...grant("Students", ["menu", "screen"]),
    ...grant("Library Management", ["menu", "api", "screen", "action"]),
  ],
  "role-receptionist": [
    ...grant("Dashboard", ["menu"]),
    ...grant("Calendar", ["menu", "screen"]),
    ...grant("Students", ["menu", "screen"]),
    ...grant("Visitor Management", ["menu", "api", "screen", "action"]),
    ...grant("Complaint / Help Desk", ["menu", "api", "screen", "action"]),
  ],
  "role-exam-coordinator": [
    ...grant("Dashboard", ["menu"]),
    ...grant("Timetable", ["menu", "screen"]),
    ...grant("Examinations", ["menu", "api", "screen", "action"]),
    ...grant("Reports & Analytics", ["menu", "screen"]),
  ],
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
    module: "Fee Management",
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
  {
    id: "pol-5",
    name: "Branch-scoped data access",
    description: "Non-admin roles may only view or edit records belonging to their own currently active branch, never another campus.",
    module: "Branch Management",
    condition: "resource.branchId == user.activeBranchId",
    roleIds: ["role-principal", "role-teacher", "role-accountant", "role-librarian", "role-receptionist", "role-exam-coordinator"],
    enabled: true,
  },
  {
    id: "pol-6",
    name: "Front-desk watchlist override",
    description: "Receptionists may still check in a visitor flagged on the watchlist, but only after acknowledging the warning banner and recording an override reason.",
    module: "Visitor Management",
    condition: "resource.watchlistMatch == true && resource.overrideReason != null",
    roleIds: ["role-receptionist"],
    enabled: true,
  },
];

export const SEED_FEATURE_TOGGLES: Omit<FeatureToggle, "tenantId">[] = [
  { id: "ft-1", key: "biometric_attendance", label: "Biometric attendance", description: "Enable fingerprint/RFID attendance devices.", module: "Attendance", enabled: true },
  { id: "ft-2", key: "gps_transport_tracking", label: "GPS transport tracking", description: "Live bus location tracking for parents.", module: "Transport", enabled: true },
  { id: "ft-3", key: "online_classes", label: "Online classes", description: "Zoom/Meet/Teams integration for remote lessons.", module: "Online Classes", enabled: false },
  { id: "ft-4", key: "ai_chatbot", label: "AI chatbot assistant", description: "AI-powered assistant for parents and staff.", module: "AI Features", enabled: false },
  { id: "ft-5", key: "whatsapp_notifications", label: "WhatsApp notifications", description: "Send fee and attendance alerts via WhatsApp.", module: "Communication", enabled: false },
  { id: "ft-6", key: "enforce_mfa", label: "Enforce multi-factor authentication", description: "Require MFA for all administrator accounts.", module: "Authentication", enabled: true },
  { id: "ft-7", key: "multi_branch_campuses", label: "Multi-branch campuses", description: "Allow this school to operate more than one physical branch/campus under the same tenant.", module: "Branches", enabled: true },
];
