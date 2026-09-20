import { mockDelay } from "@/utils/mockDelay";
import { useAuthStore } from "@/store/authStore";
import {
  DEFAULT_TENANT_ID,
  exportTenantSnapshot,
  getCurrentTenantId,
  mergeTenantSnapshot,
  migrateLegacyRecordsToDefaultTenant,
  resetCurrentTenantData,
  scopedToCurrentTenant,
} from "@/utils/tenant";
import { applyBrandPreset } from "./theme";
import type { BrandPresetKey } from "./theme";
import { DEFAULT_LOCALIZATION, DEFAULT_SCHOOL_PROFILE } from "./constants";
import { SEED_AUDIT_LOG, SEED_SYSTEM_TEMPLATES } from "./mock";
import type {
  AuditCategory,
  AuditLogEntry,
  BackupEvent,
  BackupEventType,
  LocalizationSettings,
  SchoolProfile,
  SystemTemplate,
  SystemTemplateFormValues,
} from "./types";

const PROFILE_KEY = "sms-mock-settings-profile";
const LOCALIZATION_KEY = "sms-mock-settings-localization";
const TEMPLATES_KEY = "sms-mock-settings-templates";
const AUDIT_KEY = "sms-mock-settings-audit-log";
const BACKUP_HISTORY_KEY = "sms-mock-settings-backup-history";
const BRAND_KEY = "sms-mock-settings-branding";

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

/**
 * profile/localization/brandPreset predate multi-tenancy as flat singletons at their storage
 * key. This migrates a pre-existing flat value into a Record<tenantId, T> map under
 * DEFAULT_TENANT_ID the first time this runs against old browser data — `isLegacy` tells a
 * flat value apart from an already-migrated map (whose values, not the map itself, have that
 * shape).
 */
function loadTenantMap<T>(key: string, isLegacy: (raw: unknown) => raw is T): Record<string, T> {
  const raw = loadJson<unknown>(key, null);
  if (raw === null) return {};
  if (isLegacy(raw)) {
    console.warn(`[settings] Migrating legacy singleton at "${key}" to a per-tenant map under "${DEFAULT_TENANT_ID}".`);
    return { [DEFAULT_TENANT_ID]: raw };
  }
  return raw as Record<string, T>;
}

let profileByTenant = loadTenantMap<SchoolProfile>(
  PROFILE_KEY,
  (r): r is SchoolProfile => typeof r === "object" && r !== null && "name" in r,
);
let localizationByTenant = loadTenantMap<LocalizationSettings>(
  LOCALIZATION_KEY,
  (r): r is LocalizationSettings => typeof r === "object" && r !== null && "language" in r,
);
let brandByTenant = loadTenantMap<BrandPresetKey>(BRAND_KEY, (r): r is BrandPresetKey => typeof r === "string");

let templates = migrateLegacyRecordsToDefaultTenant(
  loadJson<SystemTemplate[]>(TEMPLATES_KEY, SEED_SYSTEM_TEMPLATES.map((t) => ({ ...t, tenantId: DEFAULT_TENANT_ID }))),
);
let auditLog = migrateLegacyRecordsToDefaultTenant(
  loadJson<AuditLogEntry[]>(AUDIT_KEY, SEED_AUDIT_LOG.map((a) => ({ ...a, tenantId: DEFAULT_TENANT_ID }))),
);
let backupHistory = migrateLegacyRecordsToDefaultTenant(loadJson<BackupEvent[]>(BACKUP_HISTORY_KEY, []));

const persistProfile = () => saveJson(PROFILE_KEY, profileByTenant);
const persistLocalization = () => saveJson(LOCALIZATION_KEY, localizationByTenant);
const persistTemplates = () => saveJson(TEMPLATES_KEY, templates);
const persistAuditLog = () => saveJson(AUDIT_KEY, auditLog);
const persistBackupHistory = () => saveJson(BACKUP_HISTORY_KEY, backupHistory);
const persistBrand = () => saveJson(BRAND_KEY, brandByTenant);

function currentActorName(): string {
  return useAuthStore.getState().user?.name ?? "Unknown user";
}

function logAudit(action: string, category: AuditCategory, detail?: string) {
  const entry: AuditLogEntry = {
    id: genId("aud"),
    tenantId: getCurrentTenantId(),
    actor: currentActorName(),
    action,
    category,
    detail,
    createdAt: new Date().toISOString(),
  };
  auditLog = [entry, ...auditLog];
  persistAuditLog();
}

// ── School profile ──────────────────────────────────────────────────────

export async function getSchoolProfile(): Promise<SchoolProfile> {
  const tenantId = getCurrentTenantId();
  return mockDelay({ ...(profileByTenant[tenantId] ?? DEFAULT_SCHOOL_PROFILE) }, 300);
}

export async function updateSchoolProfile(values: SchoolProfile): Promise<SchoolProfile> {
  const tenantId = getCurrentTenantId();
  profileByTenant = { ...profileByTenant, [tenantId]: { ...values } };
  persistProfile();
  logAudit("updated school profile details", "settings");
  return mockDelay({ ...values }, 350);
}

// ── Localization ─────────────────────────────────────────────────────────

export async function getLocalization(): Promise<LocalizationSettings> {
  const tenantId = getCurrentTenantId();
  return mockDelay({ ...(localizationByTenant[tenantId] ?? DEFAULT_LOCALIZATION) }, 300);
}

export async function updateLocalization(values: LocalizationSettings): Promise<LocalizationSettings> {
  const tenantId = getCurrentTenantId();
  localizationByTenant = { ...localizationByTenant, [tenantId]: { ...values } };
  persistLocalization();
  logAudit("updated localization settings", "settings", `${values.language} · ${values.timezone} · ${values.currency}`);
  return mockDelay({ ...values }, 350);
}

// ── Branding ─────────────────────────────────────────────────────────────

export async function getBrandPreset(): Promise<BrandPresetKey> {
  const tenantId = getCurrentTenantId();
  return mockDelay(brandByTenant[tenantId] ?? "blue", 200);
}

export async function updateBrandPreset(preset: BrandPresetKey): Promise<BrandPresetKey> {
  const tenantId = getCurrentTenantId();
  brandByTenant = { ...brandByTenant, [tenantId]: preset };
  persistBrand();
  applyBrandPreset(preset);
  logAudit("changed the brand theme", "settings", preset);
  return mockDelay(preset, 300);
}

// ── System templates ─────────────────────────────────────────────────────

export async function listSystemTemplates(): Promise<SystemTemplate[]> {
  return mockDelay(scopedToCurrentTenant(templates), 300);
}

export async function updateSystemTemplate(id: string, values: SystemTemplateFormValues): Promise<SystemTemplate> {
  const tenantId = getCurrentTenantId();
  const existing = templates.find((t) => t.id === id && t.tenantId === tenantId);
  if (!existing) {
    await mockDelay(null, 200);
    throw new Error("Template not found");
  }
  const updated: SystemTemplate = { ...existing, ...values };
  templates = templates.map((t) => (t.id === id ? updated : t));
  persistTemplates();
  logAudit("updated a system template", "settings", existing.name);
  return mockDelay(updated, 350);
}

// ── Audit log ────────────────────────────────────────────────────────────

export async function listAuditLog(): Promise<AuditLogEntry[]> {
  return mockDelay(scopedToCurrentTenant(auditLog).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), 300);
}

// ── Backup / restore / reset ────────────────────────────────────────────

function recordBackupEvent(type: BackupEventType, filename?: string, sizeBytes?: number) {
  const event: BackupEvent = { id: genId("bkp"), tenantId: getCurrentTenantId(), type, filename, sizeBytes, createdAt: new Date().toISOString() };
  backupHistory = [event, ...backupHistory];
  persistBackupHistory();
}

export async function listBackupHistory(): Promise<BackupEvent[]> {
  return mockDelay(scopedToCurrentTenant(backupHistory).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), 250);
}

/** Snapshots only the current tenant's slice of every sms-mock- / sms-settings- key so it can be re-imported later. */
export async function exportBackup(): Promise<{ filename: string; sizeBytes: number }> {
  const snapshot = exportTenantSnapshot();
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), data: snapshot }, null, 2);
  const filename = `educore-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const sizeBytes = new Blob([payload]).size;

  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  recordBackupEvent("export", filename, sizeBytes);
  logAudit("exported a data backup", "data", filename);
  return mockDelay({ filename, sizeBytes }, 400);
}

/**
 * Restores a previously exported snapshot file, replacing only the current tenant's rows within
 * each key (other tenants' rows in the same key are left untouched), then reloads so every
 * module re-reads localStorage fresh.
 */
export async function restoreBackup(file: File): Promise<void> {
  const text = await file.text();
  let parsed: { data?: Record<string, unknown> };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a valid backup — it could not be parsed as JSON.");
  }
  if (!parsed.data || typeof parsed.data !== "object") {
    throw new Error("This file doesn't look like an EduCore backup.");
  }

  mergeTenantSnapshot(parsed.data);

  recordBackupEvent("restore", file.name, file.size);
  logAudit("restored a data backup", "data", file.name);
  await mockDelay(undefined, 500);
  window.location.reload();
}

/**
 * Wipes the current tenant's own data back to reseed-fresh (re-seeding only actually happens for
 * the default tenant, which is the only one with seed data to restore to), but deliberately
 * preserves this settings module's own data (profile/localization/templates/audit log/backup
 * history/brand preset) — an audit trail and configuration should survive a data reset, not
 * disappear with it.
 */
export async function resetDemoData(): Promise<void> {
  logAudit("reset all demo data to defaults", "system");
  resetCurrentTenantData();
  recordBackupEvent("reset");
  await mockDelay(undefined, 500);
  window.location.reload();
}
