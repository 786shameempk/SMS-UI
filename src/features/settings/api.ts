import { mockDelay } from "@/utils/mockDelay";
import { useAuthStore } from "@/store/authStore";
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

let profile = loadJson<SchoolProfile>(PROFILE_KEY, DEFAULT_SCHOOL_PROFILE);
let localization = loadJson<LocalizationSettings>(LOCALIZATION_KEY, DEFAULT_LOCALIZATION);
let templates = loadJson<SystemTemplate[]>(TEMPLATES_KEY, SEED_SYSTEM_TEMPLATES.map((t) => ({ ...t })));
let auditLog = loadJson<AuditLogEntry[]>(AUDIT_KEY, SEED_AUDIT_LOG.map((a) => ({ ...a })));
let backupHistory = loadJson<BackupEvent[]>(BACKUP_HISTORY_KEY, []);
let brandPreset = loadJson<BrandPresetKey>(BRAND_KEY, "blue");

const persistProfile = () => saveJson(PROFILE_KEY, profile);
const persistLocalization = () => saveJson(LOCALIZATION_KEY, localization);
const persistTemplates = () => saveJson(TEMPLATES_KEY, templates);
const persistAuditLog = () => saveJson(AUDIT_KEY, auditLog);
const persistBackupHistory = () => saveJson(BACKUP_HISTORY_KEY, backupHistory);
const persistBrand = () => saveJson(BRAND_KEY, brandPreset);

function currentActorName(): string {
  return useAuthStore.getState().user?.name ?? "Unknown user";
}

function logAudit(action: string, category: AuditCategory, detail?: string) {
  const entry: AuditLogEntry = { id: genId("aud"), actor: currentActorName(), action, category, detail, createdAt: new Date().toISOString() };
  auditLog = [entry, ...auditLog];
  persistAuditLog();
}

// ── School profile ──────────────────────────────────────────────────────

export async function getSchoolProfile(): Promise<SchoolProfile> {
  return mockDelay({ ...profile }, 300);
}

export async function updateSchoolProfile(values: SchoolProfile): Promise<SchoolProfile> {
  profile = { ...values };
  persistProfile();
  logAudit("updated school profile details", "settings");
  return mockDelay({ ...profile }, 350);
}

// ── Localization ─────────────────────────────────────────────────────────

export async function getLocalization(): Promise<LocalizationSettings> {
  return mockDelay({ ...localization }, 300);
}

export async function updateLocalization(values: LocalizationSettings): Promise<LocalizationSettings> {
  localization = { ...values };
  persistLocalization();
  logAudit("updated localization settings", "settings", `${values.language} · ${values.timezone} · ${values.currency}`);
  return mockDelay({ ...localization }, 350);
}

// ── Branding ─────────────────────────────────────────────────────────────

export async function getBrandPreset(): Promise<BrandPresetKey> {
  return mockDelay(brandPreset, 200);
}

export async function updateBrandPreset(preset: BrandPresetKey): Promise<BrandPresetKey> {
  brandPreset = preset;
  persistBrand();
  applyBrandPreset(preset);
  logAudit("changed the brand theme", "settings", preset);
  return mockDelay(brandPreset, 300);
}

// ── System templates ─────────────────────────────────────────────────────

export async function listSystemTemplates(): Promise<SystemTemplate[]> {
  return mockDelay([...templates], 300);
}

export async function updateSystemTemplate(id: string, values: SystemTemplateFormValues): Promise<SystemTemplate> {
  const existing = templates.find((t) => t.id === id);
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
  return mockDelay([...auditLog].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), 300);
}

// ── Backup / restore / reset ────────────────────────────────────────────

function recordBackupEvent(type: BackupEventType, filename?: string, sizeBytes?: number) {
  const event: BackupEvent = { id: genId("bkp"), type, filename, sizeBytes, createdAt: new Date().toISOString() };
  backupHistory = [event, ...backupHistory];
  persistBackupHistory();
}

export async function listBackupHistory(): Promise<BackupEvent[]> {
  return mockDelay([...backupHistory].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), 250);
}

/** Snapshots every sms-mock-* / sms-settings-* localStorage key so it can be re-imported later. */
export async function exportBackup(): Promise<{ filename: string; sizeBytes: number }> {
  const snapshot: Record<string, string> = {};
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !(key.startsWith("sms-mock-") || key.startsWith("sms-settings-"))) continue;
    const value = localStorage.getItem(key);
    if (value !== null) snapshot[key] = value;
  }
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

/** Restores a previously exported snapshot file, then reloads so every module re-reads localStorage fresh. */
export async function restoreBackup(file: File): Promise<void> {
  const text = await file.text();
  let parsed: { data?: Record<string, string> };
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("This file isn't a valid backup — it could not be parsed as JSON.");
  }
  if (!parsed.data || typeof parsed.data !== "object") {
    throw new Error("This file doesn't look like an EduCore backup.");
  }

  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sms-mock-") || key.startsWith("sms-settings-")) localStorage.removeItem(key);
  }
  for (const [key, value] of Object.entries(parsed.data)) {
    if (key.startsWith("sms-mock-") || key.startsWith("sms-settings-")) localStorage.setItem(key, value);
  }

  recordBackupEvent("restore", file.name, file.size);
  logAudit("restored a data backup", "data", file.name);
  await mockDelay(undefined, 500);
  window.location.reload();
}

/**
 * Wipes every module's mock data back to reseed-fresh, but deliberately preserves this settings
 * module's own data (profile/localization/templates/audit log/backup history/brand preset) —
 * an audit trail and configuration should survive a data reset, not disappear with it.
 */
export async function resetDemoData(): Promise<void> {
  logAudit("reset all demo data to defaults", "system");
  for (const key of Object.keys(localStorage)) {
    if (key.startsWith("sms-mock-") && !key.startsWith("sms-mock-settings-")) localStorage.removeItem(key);
  }
  recordBackupEvent("reset");
  await mockDelay(undefined, 500);
  window.location.reload();
}
