import { authHttpClient } from "@/lib/httpClient";
import type { UserRole } from "@/types/auth";
import type { LayoutItem } from "./layout";
import type { DashboardWidgetId, WidgetHeight, WidgetWidth } from "./widgets";

/**
 * AuthService's dashboard configuration API (/api/dashboard). The server decides which widgets the user may
 * have (role + module permissions + the school's widget settings) and stores each user's layout; it refuses a
 * layout containing a widget the user isn't allowed.
 */

/** A widget the user may have, with the school's defaults. */
export interface ServerWidget {
  id: DashboardWidgetId;
  defaultVisible: boolean;
  defaultOrder: number;
  defaultWidth: WidgetWidth;
  defaultHeight: WidgetHeight;
  configurable: boolean;
  refreshInterval: number;
}

export interface ServerLayout {
  items: LayoutItem[];
  /** False = the role's default dashboard. */
  customized: boolean;
  updatedAt: string | null;
}

export interface ServerDashboard {
  role: UserRole;
  widgets: ServerWidget[];
  layout: ServerLayout;
}

export async function getDashboardConfig(): Promise<ServerDashboard> {
  const { data } = await authHttpClient.get<ServerDashboard>("/api/dashboard");
  return data;
}

export async function saveDashboardLayout(items: LayoutItem[]): Promise<ServerLayout> {
  const { data } = await authHttpClient.put<ServerLayout>("/api/dashboard/layout", {
    items: items.map(({ id, visible, w, h }) => ({ id, visible, w, h })),
  });
  return data;
}

export async function resetDashboardLayout(): Promise<ServerLayout> {
  const { data } = await authHttpClient.post<ServerLayout>("/api/dashboard/layout/reset");
  return data;
}

// ── Widget management (school administrators) ───────────────────────────

export interface AdminWidgetSetting {
  id: DashboardWidgetId;
  name: string;
  /** Roles the widget can ever be given to; null = every role. */
  catalogRoles: UserRole[] | null;
  requiredModule: string | null;
  allBranchesOnly: boolean;
  enabled: boolean;
  /** Roles this school gives it to; null = all catalog roles. */
  allowedRoles: UserRole[] | null;
  defaultVisible: boolean;
  defaultOrder: number;
  defaultWidth: WidgetWidth;
  defaultHeight: WidgetHeight;
  configurable: boolean;
  refreshInterval: number;
  customized: boolean;
  updatedAt: string | null;
}

export type AdminWidgetSettingInput = Pick<
  AdminWidgetSetting,
  "enabled" | "allowedRoles" | "defaultVisible" | "defaultOrder" | "defaultWidth" | "defaultHeight" | "configurable" | "refreshInterval"
>;

export async function listAdminWidgetSettings(): Promise<AdminWidgetSetting[]> {
  const { data } = await authHttpClient.get<AdminWidgetSetting[]>("/api/dashboard/admin/widgets");
  return data;
}

export async function saveAdminWidgetSetting(id: DashboardWidgetId, input: AdminWidgetSettingInput): Promise<AdminWidgetSetting> {
  const { data } = await authHttpClient.put<AdminWidgetSetting>(`/api/dashboard/admin/widgets/${encodeURIComponent(id)}`, input);
  return data;
}

export async function resetAdminWidgetSetting(id: DashboardWidgetId): Promise<AdminWidgetSetting> {
  const { data } = await authHttpClient.delete<AdminWidgetSetting>(`/api/dashboard/admin/widgets/${encodeURIComponent(id)}`);
  return data;
}

/** Clears every saved dashboard of one role in this school; returns how many were reset. */
export async function resetRoleDashboards(role: UserRole): Promise<number> {
  const { data } = await authHttpClient.post<{ reset: number }>("/api/dashboard/admin/layouts/reset", { role });
  return data.reset;
}
