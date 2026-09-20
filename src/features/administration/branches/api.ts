import { mockDelay } from "@/utils/mockDelay";
import { defaultBranchIdForTenant, getCurrentTenantId } from "@/utils/tenant";
import type { Branch, BranchFormValues } from "./types";

const BRANCHES_KEY = "sms-mock-branches";

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

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let branches = loadJson<Branch[]>(BRANCHES_KEY, []);

function persistBranches() {
  saveJson(BRANCHES_KEY, branches);
}

/**
 * Every tenant needs a "Main Campus" branch to exist before it can be listed or picked from.
 * Lazily provisioned the first time a tenant's branches are touched, rather than a one-time
 * global seed — this transparently covers every platform tenant, both the ones seeded at
 * launch and any created later through Platform Console, with no cross-module dependency on
 * platform/api.ts (which would risk a circular import, since branches has no reason to know
 * about the tenant registry — it only ever needs the *current* tenant id).
 */
function ensureDefaultBranch(tenantId: string): void {
  const id = defaultBranchIdForTenant(tenantId);
  if (branches.some((b) => b.id === id)) return;
  branches = [...branches, { id, tenantId, name: "Main Campus", code: "MAIN", status: "active", createdAt: new Date().toISOString() }];
  persistBranches();
}

function requireBranch(id: string): Branch {
  const tenantId = getCurrentTenantId();
  const found = branches.find((b) => b.id === id && b.tenantId === tenantId);
  if (!found) throw new Error("Branch not found");
  return found;
}

export async function listBranches(): Promise<Branch[]> {
  const tenantId = getCurrentTenantId();
  ensureDefaultBranch(tenantId);
  return mockDelay(
    branches.filter((b) => b.tenantId === tenantId).sort((a, b) => a.name.localeCompare(b.name)),
    300,
  );
}

export async function createBranch(values: BranchFormValues): Promise<Branch> {
  const tenantId = getCurrentTenantId();
  ensureDefaultBranch(tenantId);
  if (branches.some((b) => b.tenantId === tenantId && b.code.trim().toLowerCase() === values.code.trim().toLowerCase())) {
    await mockDelay(null, 300);
    throw new Error("A branch with this code already exists");
  }
  const branch: Branch = { id: genId("branch"), tenantId, ...values, code: values.code.trim().toUpperCase(), createdAt: new Date().toISOString() };
  branches = [...branches, branch];
  persistBranches();
  return mockDelay(branch, 400);
}

export async function updateBranch(id: string, values: BranchFormValues): Promise<Branch> {
  const tenantId = getCurrentTenantId();
  requireBranch(id);
  if (branches.some((b) => b.tenantId === tenantId && b.id !== id && b.code.trim().toLowerCase() === values.code.trim().toLowerCase())) {
    await mockDelay(null, 300);
    throw new Error("A branch with this code already exists");
  }
  const updated: Branch = { ...requireBranch(id), ...values, code: values.code.trim().toUpperCase() };
  branches = branches.map((b) => (b.id === id ? updated : b));
  persistBranches();
  return mockDelay(updated, 400);
}

export async function deleteBranch(id: string): Promise<void> {
  const tenantId = getCurrentTenantId();
  requireBranch(id);
  if (id === defaultBranchIdForTenant(tenantId)) {
    await mockDelay(null, 300);
    throw new Error("The main campus branch can't be deleted");
  }
  branches = branches.filter((b) => !(b.id === id && b.tenantId === tenantId));
  persistBranches();
  return mockDelay(undefined, 350);
}
