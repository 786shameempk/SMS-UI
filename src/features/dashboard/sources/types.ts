import type { UserRole } from "@/types/auth";
import type { DashboardData, DashboardScopeView, ScopeSummary } from "../types";

/** A student the signed-in person may see data for: their own record (student) or a linked child (parent). */
export interface Learner {
  studentId: string;
  name: string;
  sectionId: string;
  classId: string;
  /** e.g. "Grade 8 - A". */
  classLabel: string;
}

/** Who the signed-in login is in the school (AcademicService GET /api/people/me). */
export interface DashboardIdentity {
  staffId: string | null;
  learners: Learner[];
}

/** Everything a widget loader needs. Built once per page render; part of every query key. */
export interface DashboardContext {
  role: UserRole;
  userId: string;
  /** Inclusive local-time bounds of the selected date range. */
  range: { start: Date; end: Date };
  identity: DashboardIdentity;
}

/** One loader per widget; the key is also the DashboardData field it fills. */
export type WidgetDataKey = keyof DashboardData;

export type WidgetLoaders = { [K in WidgetDataKey]: (ctx: DashboardContext) => Promise<DashboardData[K]> };

/** A complete data source: every widget plus the identity and branch overview lookups. */
export interface DashboardSourceImpl {
  identity: (role: UserRole) => Promise<DashboardIdentity>;
  widgets: WidgetLoaders;
  scope: (
    view: DashboardScopeView,
    tenantId: string,
    branchId: string,
    range: { start: Date; end: Date },
  ) => Promise<ScopeSummary>;
}

/** Roles that only ever see their own (or their children's) records, never the school-wide lists. */
export const PERSONAL_ROLES: UserRole[] = ["parent", "student"];

export const isPersonal = (role: UserRole) => PERSONAL_ROLES.includes(role);
