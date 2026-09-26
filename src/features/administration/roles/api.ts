import { authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { PERMISSION_CATALOG } from "./constants";
import type { FeatureToggle, Permission, Policy, PolicyFormValues, Role, RoleFormValues, RolePermissionMap } from "./types";

// Real AuthService-backed (/api/school-roles), scoped server-side to the active tenant. Built-in
// roles are shared by every school, so only a school's own custom roles can be renamed/deleted.

interface ApiSchoolRole {
  id: string;
  tenantId: string | null;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  grantsAllBranchAccess: boolean;
  createdAt: string;
  userCount: number;
}

interface ApiPolicy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  module: string;
  condition: string;
  roleIds: string[];
  enabled: boolean;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

const mapRole = (dto: ApiSchoolRole): Role => ({
  id: dto.id,
  tenantId: dto.tenantId ?? "",
  name: dto.name,
  description: dto.description,
  isSystem: dto.isSystem,
  grantsAllBranchAccess: dto.grantsAllBranchAccess,
  createdAt: dto.createdAt,
});

const fetchRoles = () => unwrap(authHttpClient.get<ApiSchoolRole[]>("/api/school-roles"));

// ── Roles ──────────────────────────────────────────────────────────────────

export async function listRoles(): Promise<Role[]> {
  return (await fetchRoles()).map(mapRole);
}

export async function getRoleUserCounts(): Promise<Record<string, number>> {
  return Object.fromEntries((await fetchRoles()).map((r) => [r.id, r.userCount]));
}

export async function createRole(values: RoleFormValues): Promise<Role> {
  return mapRole(await unwrap(authHttpClient.post<ApiSchoolRole>("/api/school-roles", values)));
}

export async function updateRole(id: string, values: RoleFormValues): Promise<Role> {
  return mapRole(await unwrap(authHttpClient.put<ApiSchoolRole>(`/api/school-roles/${id}`, values)));
}

export async function deleteRole(id: string): Promise<void> {
  await unwrap(authHttpClient.delete<void>(`/api/school-roles/${id}`));
}

// ── Permissions ──────────────────────────────────────────────────────────────

/** The catalog is static app metadata (one row per nav destination), shared verbatim with AuthService. */
export async function listPermissions(): Promise<Permission[]> {
  return [...PERMISSION_CATALOG];
}

/** Which matrix modules this user may see and grant: their school's plan, or every module for superAdmin. */
export interface MatrixModuleScope {
  restricted: boolean;
  planName: string | null;
  modules: string[];
}

export async function getMatrixModules(): Promise<MatrixModuleScope> {
  return unwrap(authHttpClient.get<MatrixModuleScope>("/api/school-roles/matrix/modules"));
}

export const MATRIX_MODULES_QUERY_KEY = ["admin", "matrix-modules"] as const;

export async function getRolePermissions(): Promise<RolePermissionMap> {
  return unwrap(authHttpClient.get<RolePermissionMap>("/api/school-roles/matrix"));
}

export async function setRolePermission(roleId: string, permissionId: string, granted: boolean): Promise<RolePermissionMap> {
  await unwrap(authHttpClient.put<void>(`/api/school-roles/${roleId}/matrix/${encodeURIComponent(permissionId)}`, { granted }));
  return getRolePermissions();
}

// ── Policies ─────────────────────────────────────────────────────────────────

export async function listPolicies(): Promise<Policy[]> {
  return unwrap(authHttpClient.get<ApiPolicy[]>("/api/school-roles/policies"));
}

export async function createPolicy(values: PolicyFormValues): Promise<Policy> {
  return unwrap(authHttpClient.post<ApiPolicy>("/api/school-roles/policies", values));
}

export async function updatePolicy(id: string, values: PolicyFormValues): Promise<Policy> {
  return unwrap(authHttpClient.put<ApiPolicy>(`/api/school-roles/policies/${id}`, values));
}

export async function deletePolicy(id: string): Promise<void> {
  await unwrap(authHttpClient.delete<void>(`/api/school-roles/policies/${id}`));
}

export async function setPolicyEnabled(id: string, enabled: boolean): Promise<Policy> {
  return unwrap(authHttpClient.put<ApiPolicy>(`/api/school-roles/policies/${id}/enabled`, { enabled }));
}

// ── Feature toggles ──────────────────────────────────────────────────────────

export async function listFeatureToggles(): Promise<FeatureToggle[]> {
  return unwrap(authHttpClient.get<FeatureToggle[]>("/api/school-roles/feature-toggles"));
}

export async function setFeatureToggle(id: string, enabled: boolean): Promise<FeatureToggle> {
  return unwrap(authHttpClient.put<FeatureToggle>(`/api/school-roles/feature-toggles/${id}`, { enabled }));
}
