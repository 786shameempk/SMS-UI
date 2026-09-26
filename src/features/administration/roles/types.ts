
export interface Role {
  id: string;
  /** Only meaningful for custom (non-system) roles — system roles are shared across every tenant. */
  tenantId: string;
  name: string;
  description: string;
  isSystem: boolean;
  /** Whether a user with this role isn't locked to one branch (mirrors admin/superAdmin's
   *  AuthUser.branchId === null) — used by the Users form to decide whether a branch field is
   *  required, instead of a fragile match on a specific role id. Only ever true for the
   *  built-in Administrator role. */
  grantsAllBranchAccess: boolean;
  createdAt: string;
}

export interface RoleFormValues {
  name: string;
  description: string;
}

export type PermissionCategory = "menu" | "api" | "screen" | "action";

export interface Permission {
  id: string;
  label: string;
  module: string;
  category: PermissionCategory;
}

/** roleId -> set of granted permission ids */
export type RolePermissionMap = Record<string, string[]>;

export interface Policy {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  module: string;
  condition: string;
  roleIds: string[];
  enabled: boolean;
}

export interface PolicyFormValues {
  name: string;
  description: string;
  module: string;
  condition: string;
  roleIds: string[];
}

export interface FeatureToggle {
  id: string;
  tenantId: string;
  key: string;
  label: string;
  description: string;
  module: string;
  enabled: boolean;
}
