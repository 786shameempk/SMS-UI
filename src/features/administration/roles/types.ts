export interface Role {
  id: string;
  name: string;
  description: string;
  isSystem: boolean;
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
  key: string;
  label: string;
  description: string;
  module: string;
  enabled: boolean;
}
