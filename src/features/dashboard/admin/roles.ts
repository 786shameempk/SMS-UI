import type { UserRole } from "@/types/auth";

/** Every role a dashboard widget can be given to (AuthService's DashboardWidgetCatalog.AssignableRoles). */
export const ASSIGNABLE_ROLES: UserRole[] = ["superAdmin", "admin", "principal", "teacher", "accountant", "librarian", "receptionist", "parent", "student", "staff"];

export const ROLE_NAME: Record<string, string> = {
  superAdmin: "Super admin",
  admin: "Administrator",
  principal: "Principal",
  teacher: "Teacher",
  accountant: "Accountant",
  librarian: "Librarian",
  receptionist: "Receptionist",
  parent: "Parent",
  student: "Student",
  staff: "All custom roles",
};

/** The roles a school's dashboards can be reset for (not the platform super admin). */
export const SCHOOL_ROLES: string[] = ASSIGNABLE_ROLES.filter((r) => r !== "superAdmin");
