
export interface Role {
  id: string;
  /** Only meaningful for custom (non-system) roles — system roles are shared across every tenant. */
  tenantId: string;
  name: string;
  description: string;
  isSystem: boolean;
  /** Whether a user with this role works across every branch of the school (switching in the header)
   *  instead of being locked to one — the Users form skips the branch field for these roles. True for
   *  the built-in Administrator, and for any custom role created or edited with "All branches". */
  grantsAllBranchAccess: boolean;
  createdAt: string;
}

export interface RoleFormValues {
  name: string;
  description: string;
  grantsAllBranchAccess: boolean;
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
