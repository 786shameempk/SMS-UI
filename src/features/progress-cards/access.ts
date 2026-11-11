import { useAuthStore } from "@/store/authStore";

export interface ProgressCardAccess {
  /** Templates, grading schemes, assignments and subject rules. */
  canManage: boolean;
  /** Check, preview, generate, print and download; co-scholastic entry (class teachers: their own class). */
  canGenerate: boolean;
  /** Approve, publish and unpublish. */
  canApprove: boolean;
}

/**
 * What the signed-in user may do with progress cards, from the Examinations module flag and the staff actions in their session
 * (Roles & permissions → Staff actions). A session from before staff actions existed (no "Staff.Managed" marker) is judged by the module,
 * with management and approval kept for school leaders: the same rule the server applies. The server enforces everything again; this only
 * decides what to show.
 */
export function useProgressCardAccess(): ProgressCardAccess {
  const permissions = useAuthStore((s) => s.modulePermissions);
  const role = useAuthStore((s) => s.user?.role);
  if (role === "parent" || role === "student") return { canManage: false, canGenerate: false, canApprove: false };
  // No permission map at all means a session that carries no per-module limits (for example the platform operator): show everything.
  if (!permissions) return { canManage: true, canGenerate: true, canApprove: true };
  if (!permissions.examinations) return { canManage: false, canGenerate: false, canApprove: false };
  // A session issued before progress cards existed carries staff actions but none of ProgressCards.*; judge it like an unmanaged one
  // so an administrator isn't left without the generator's tabs until they sign in again.
  const knowsProgressCards = Object.keys(permissions).some((k) => k.startsWith("ProgressCards."));
  const managed = Boolean(permissions["Staff.Managed"]) && knowsProgressCards;
  const leader = role === "admin" || role === "principal" || role === "superAdmin";
  const can = (action: string, elevated: boolean) => (managed ? Boolean(permissions[action]) : !elevated || leader);
  return { canManage: can("ProgressCards.Manage", true), canGenerate: can("ProgressCards.Generate", false), canApprove: can("ProgressCards.Approve", true) };
}
