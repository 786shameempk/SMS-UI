import { useAuthStore } from "@/store/authStore";

/**
 * HR: may see and record leave for everyone and run the staff directory (SuperAdmin, Admin, Principal, or a role holding the
 * payroll module). Teachers and other staff get the self-service view: their own details, leave requests and payslips.
 * Mirrors AcademicService's StaffVisibility.IsHrManager, which enforces it on the server.
 */
export function useIsHrManager(): boolean {
  const role = useAuthStore((s) => s.user?.role);
  const modulePermissions = useAuthStore((s) => s.modulePermissions);
  return role === "superAdmin" || role === "admin" || role === "principal" || Boolean(modulePermissions?.payroll);
}
