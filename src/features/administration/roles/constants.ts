import type { Permission, PermissionCategory } from "./types";

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

export const PERMISSION_CATALOG: Permission[] = buildPermissions();
