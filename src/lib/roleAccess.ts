import { useAuthStore } from "@/store/authStore";

/**
 * The teacher role is a scoped, mostly read-only staff role: it sees its own classes' students and its own profile and
 * attendance summary, and views (never edits) academic master data. Screens use this to hide what a teacher may not do;
 * AcademicService enforces the same limits on the server.
 */
export function useIsTeacher(): boolean {
  return useAuthStore((s) => s.user?.role === "teacher");
}
