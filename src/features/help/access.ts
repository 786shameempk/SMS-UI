import { ROLE_LABELS, getModule, type AppRoute, type HelpAccess, type HelpModule, type HelpRole } from "@/app/routeRegistry";
import type { ModulePermissions, UserRole } from "@/types/auth";
import type { HelpArticle } from "./types";

/** Who is reading: nobody (not signed in), or a user with a role and the school's module permissions. */
export interface Viewer {
  role: UserRole | null;
  /** The signed-in user's module permissions; null before they load, which (as in the menu) means "allow". */
  permissions: ModulePermissions | null;
}

export const ANONYMOUS: Viewer = { role: null, permissions: null };

/** The same split the menu uses for staff-only and student-only entries. */
const STAFF_AUDIENCE: UserRole[] = ["superAdmin", "admin", "principal", "teacher"];

const ADMIN_READERS: UserRole[] = ["superAdmin", "admin", "principal"];

/** Whether a classification lets this viewer read the article. This is about reading help, not about acting on a screen. */
export function canRead(access: HelpAccess, viewer: Viewer): boolean {
  if (access === "public") return true;
  if (!viewer.role) return false;
  if (access === "member") return true;
  if (access === "admin") return ADMIN_READERS.includes(viewer.role);
  return viewer.role === "superAdmin";
}

export function visibleArticles(articles: HelpArticle[], viewer: Viewer): HelpArticle[] {
  return articles.filter((a) => canRead(a.access, viewer));
}

/** Whether the module's menu entry is visible to this viewer (school plan and role), mirroring the sidebar. */
export function canUseModule(module: HelpModule, viewer: Viewer): boolean {
  if (!viewer.role) return false;
  if (module.access === "platform" && viewer.role !== "superAdmin") return false;
  if (!module.moduleKey) return true;
  return !viewer.permissions || Boolean(viewer.permissions[module.moduleKey]);
}

/**
 * Whether this viewer can be taken to the screen: signed in, the module is on for them, and the menu's audience rule holds.
 * The server still enforces everything; this only avoids sending someone to a page that will refuse them.
 */
export function canOpenRoute(route: AppRoute, viewer: Viewer): boolean {
  if (route.public) return true;
  const module = getModule(route.moduleId);
  if (!module || !viewer.role) return false;
  if (route.moduleId === "azure") return viewer.role === "superAdmin";
  if (!canUseModule(module, viewer)) return false;
  if (route.audience === "student") return viewer.role === "student";
  if (route.audience === "staff") return STAFF_AUDIENCE.includes(viewer.role);
  return true;
}

/** Parents and students: their access to a task is only what an article names for them, never inferred from a module being on. */
const FAMILY_ROLES: UserRole[] = ["parent", "student"];

/**
 * Whether the viewer's role may do what an article describes. Staff roles (including custom school roles) are decided by
 * the module being on for them; parents and students may only do what an article lists for their own role, so a staff task
 * such as marking attendance is never offered to them even when a module they can open shares its name.
 */
export function canDoTask(roles: HelpRole[], viewer: Viewer): boolean {
  if (!viewer.role) return false;
  if (!FAMILY_ROLES.includes(viewer.role)) return true;
  return roles.includes(viewer.role as HelpRole);
}

const ROLE_PLURAL: Partial<Record<HelpRole, string>> = {
  superAdmin: "the platform administrator",
  admin: "school administrators",
  principal: "principals",
  teacher: "teachers",
  accountant: "accountants",
  librarian: "librarians",
  receptionist: "receptionists",
  parent: "parents",
  student: "students",
  staff: "school staff",
};

/** "As a parent you can't mark student attendance. That is done by school administrators, principals and teachers." */
export function explainRoleBlock(taskLabel: string, roles: HelpRole[], viewer: Viewer): string {
  const you = viewer.role ? (ROLE_LABELS[viewer.role as HelpRole] ?? viewer.role).toLowerCase() : "user";
  const article = /^[aeiou]/.test(you) ? "an" : "a";
  const what = taskLabel.charAt(0).toLowerCase() + taskLabel.slice(1);
  const who = roles.filter((r) => r !== (viewer.role as HelpRole)).map((r) => ROLE_PLURAL[r] ?? r);
  const list = who.length > 1 ? `${who.slice(0, -1).join(", ")} and ${who[who.length - 1]}` : who[0];
  return `You are signed in as ${article} ${you}, so you can't ${what}.${list ? ` That is done by ${list}.` : ""} If you think you should be able to, ask your school administrator.`;
}

/** Why a viewer cannot open a screen, in words fit to show them. */
export function explainNoAccess(route: AppRoute, viewer: Viewer): string {
  const module = getModule(route.moduleId);
  if (!viewer.role) return "Sign in to open this screen.";
  if (module?.access === "platform" || route.moduleId === "azure") return `${module?.title ?? "This screen"} is only for the platform administrator.`;
  if (route.audience === "student") return `${route.label} is for students.`;
  if (route.audience === "staff") return `${route.label} is for school staff.`;
  return `${module?.title ?? "This module"} is not available to your account. Your school's plan or your role does not include it; ask your school administrator if you need it.`;
}
