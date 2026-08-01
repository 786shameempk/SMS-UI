import { mockDelay } from "@/utils/mockDelay";
import { listUsers } from "../users/api";
import {
  SEED_FEATURE_TOGGLES,
  SEED_POLICIES,
  SEED_PERMISSIONS,
  SEED_ROLE_PERMISSIONS,
  SEED_ROLES,
} from "./mock";
import type { FeatureToggle, Permission, Policy, PolicyFormValues, Role, RoleFormValues, RolePermissionMap } from "./types";

const ROLES_KEY = "sms-mock-roles";
const ROLE_PERMISSIONS_KEY = "sms-mock-role-permissions";
const POLICIES_KEY = "sms-mock-policies";
const FEATURE_TOGGLES_KEY = "sms-mock-feature-toggles";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

let roles = loadJson<Role[]>(ROLES_KEY, SEED_ROLES.map((r) => ({ ...r })));
let rolePermissions = loadJson<RolePermissionMap>(ROLE_PERMISSIONS_KEY, { ...SEED_ROLE_PERMISSIONS });
let policies = loadJson<Policy[]>(POLICIES_KEY, SEED_POLICIES.map((p) => ({ ...p })));
let featureToggles = loadJson<FeatureToggle[]>(FEATURE_TOGGLES_KEY, SEED_FEATURE_TOGGLES.map((f) => ({ ...f })));

function nextRoleId(): string {
  return `role-custom-${Math.random().toString(36).slice(2, 8)}`;
}

function nextPolicyId(): string {
  const max = policies.reduce((acc, p) => Math.max(acc, Number(p.id.replace("pol-", "")) || 0), 0);
  return `pol-${max + 1}`;
}

// ── Roles ──────────────────────────────────────────────────────────────────

export async function listRoles(): Promise<Role[]> {
  return mockDelay([...roles], 350);
}

export async function getRoleUserCounts(): Promise<Record<string, number>> {
  const users = await listUsers();
  const counts: Record<string, number> = {};
  for (const user of users) counts[user.roleId] = (counts[user.roleId] ?? 0) + 1;
  return counts;
}

export async function createRole(values: RoleFormValues): Promise<Role> {
  if (roles.some((r) => r.name.toLowerCase() === values.name.trim().toLowerCase())) {
    await mockDelay(null, 350);
    throw new Error("A role with this name already exists");
  }
  const role: Role = {
    id: nextRoleId(),
    name: values.name.trim(),
    description: values.description.trim(),
    isSystem: false,
    createdAt: new Date().toISOString(),
  };
  roles = [...roles, role];
  rolePermissions = { ...rolePermissions, [role.id]: [] };
  saveJson(ROLES_KEY, roles);
  saveJson(ROLE_PERMISSIONS_KEY, rolePermissions);
  return mockDelay(role, 400);
}

export async function updateRole(id: string, values: RoleFormValues): Promise<Role> {
  const idx = roles.findIndex((r) => r.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("Role not found");
  }
  if (roles.some((r) => r.id !== id && r.name.toLowerCase() === values.name.trim().toLowerCase())) {
    await mockDelay(null, 350);
    throw new Error("A role with this name already exists");
  }
  const updated: Role = { ...roles[idx], name: values.name.trim(), description: values.description.trim() };
  roles = roles.map((r) => (r.id === id ? updated : r));
  saveJson(ROLES_KEY, roles);
  return mockDelay(updated, 400);
}

export async function deleteRole(id: string): Promise<void> {
  const role = roles.find((r) => r.id === id);
  if (!role) {
    await mockDelay(null, 300);
    throw new Error("Role not found");
  }
  if (role.isSystem) {
    await mockDelay(null, 300);
    throw new Error("Built-in roles cannot be deleted");
  }
  const counts = await getRoleUserCounts();
  if ((counts[id] ?? 0) > 0) {
    throw new Error(`Reassign ${counts[id]} user(s) away from this role before deleting it`);
  }
  roles = roles.filter((r) => r.id !== id);
  const remainingPermissions = { ...rolePermissions };
  delete remainingPermissions[id];
  rolePermissions = remainingPermissions;
  saveJson(ROLES_KEY, roles);
  saveJson(ROLE_PERMISSIONS_KEY, rolePermissions);
}

// ── Permissions ──────────────────────────────────────────────────────────────

export async function listPermissions(): Promise<Permission[]> {
  return mockDelay([...SEED_PERMISSIONS], 300);
}

export async function getRolePermissions(): Promise<RolePermissionMap> {
  return mockDelay({ ...rolePermissions }, 300);
}

export async function setRolePermission(roleId: string, permissionId: string, granted: boolean): Promise<RolePermissionMap> {
  const current = new Set(rolePermissions[roleId] ?? []);
  if (granted) current.add(permissionId);
  else current.delete(permissionId);
  rolePermissions = { ...rolePermissions, [roleId]: Array.from(current) };
  saveJson(ROLE_PERMISSIONS_KEY, rolePermissions);
  return mockDelay({ ...rolePermissions }, 150);
}

// ── Policies ─────────────────────────────────────────────────────────────────

export async function listPolicies(): Promise<Policy[]> {
  return mockDelay([...policies], 350);
}

export async function createPolicy(values: PolicyFormValues): Promise<Policy> {
  const policy: Policy = { id: nextPolicyId(), enabled: true, ...values };
  policies = [policy, ...policies];
  saveJson(POLICIES_KEY, policies);
  return mockDelay(policy, 400);
}

export async function updatePolicy(id: string, values: PolicyFormValues): Promise<Policy> {
  const idx = policies.findIndex((p) => p.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("Policy not found");
  }
  const updated: Policy = { ...policies[idx], ...values };
  policies = policies.map((p) => (p.id === id ? updated : p));
  saveJson(POLICIES_KEY, policies);
  return mockDelay(updated, 400);
}

export async function deletePolicy(id: string): Promise<void> {
  policies = policies.filter((p) => p.id !== id);
  saveJson(POLICIES_KEY, policies);
  await mockDelay(null, 300);
}

export async function setPolicyEnabled(id: string, enabled: boolean): Promise<Policy> {
  const idx = policies.findIndex((p) => p.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("Policy not found");
  }
  const updated = { ...policies[idx], enabled };
  policies = policies.map((p) => (p.id === id ? updated : p));
  saveJson(POLICIES_KEY, policies);
  return mockDelay(updated, 250);
}

// ── Feature toggles ──────────────────────────────────────────────────────────

export async function listFeatureToggles(): Promise<FeatureToggle[]> {
  return mockDelay([...featureToggles], 300);
}

export async function setFeatureToggle(id: string, enabled: boolean): Promise<FeatureToggle> {
  const idx = featureToggles.findIndex((f) => f.id === id);
  if (idx === -1) {
    await mockDelay(null, 300);
    throw new Error("Feature not found");
  }
  const updated = { ...featureToggles[idx], enabled };
  featureToggles = featureToggles.map((f) => (f.id === id ? updated : f));
  saveJson(FEATURE_TOGGLES_KEY, featureToggles);
  return mockDelay(updated, 250);
}
