import { authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { applyBrandPreset, applyDensityPreset, applyRadiusPreset } from "./theme";
import type { BrandPresetKey, DensityPresetKey, RadiusPresetKey } from "./theme";
import type {
  AuditLogEntry,
  BackupEvent,
  LocalizationSettings,
  SchoolProfile,
  SystemTemplate,
  SystemTemplateFormValues,
} from "./types";

// Real AuthService-backed (/api/settings), one row of settings per tenant. Every change is
// audit-logged server-side, which is what the Audit Log tab below reads back.

interface ApiSchoolProfile {
  name: string;
  tagline: string | null;
  address: string;
  phone: string;
  email: string;
  principalName: string | null;
  establishedYear: number | null;
}

interface ApiAppearance {
  brandPreset: BrandPresetKey;
  radiusPreset: RadiusPresetKey;
  densityPreset: DensityPresetKey;
}

interface ApiSettings {
  profile: ApiSchoolProfile;
  localization: LocalizationSettings;
  appearance: ApiAppearance;
}

interface ApiTemplate extends Omit<SystemTemplate, "channel" | "subject"> {
  channel: "Email" | "Sms";
  subject: string | null;
}

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

const mapProfile = (p: ApiSchoolProfile): SchoolProfile => ({
  name: p.name,
  tagline: p.tagline ?? undefined,
  address: p.address,
  phone: p.phone,
  email: p.email,
  principalName: p.principalName ?? undefined,
  establishedYear: p.establishedYear ?? undefined,
});

const mapTemplate = (t: ApiTemplate): SystemTemplate => ({
  ...t,
  channel: t.channel === "Sms" ? "sms" : "email",
  subject: t.subject ?? undefined,
});

const getSettings = () => unwrap(authHttpClient.get<ApiSettings>("/api/settings"));

const updateAppearance = (patch: Partial<ApiAppearance>) =>
  unwrap(authHttpClient.patch<ApiAppearance>("/api/settings/appearance", patch));

// ── School profile ──────────────────────────────────────────────────────

export async function getSchoolProfile(): Promise<SchoolProfile> {
  return mapProfile((await getSettings()).profile);
}

export async function updateSchoolProfile(values: SchoolProfile): Promise<SchoolProfile> {
  return mapProfile(
    await unwrap(
      authHttpClient.put<ApiSchoolProfile>("/api/settings/profile", {
        ...values,
        tagline: values.tagline || null,
        principalName: values.principalName || null,
        establishedYear: values.establishedYear || null,
      }),
    ),
  );
}

// ── Localization ─────────────────────────────────────────────────────────

export async function getLocalization(): Promise<LocalizationSettings> {
  return (await getSettings()).localization;
}

export async function updateLocalization(values: LocalizationSettings): Promise<LocalizationSettings> {
  return unwrap(authHttpClient.put<LocalizationSettings>("/api/settings/localization", values));
}

// ── Appearance (brand / corner style / density) ─────────────────────────

export async function getBrandPreset(): Promise<BrandPresetKey> {
  return (await getSettings()).appearance.brandPreset;
}

export async function updateBrandPreset(preset: BrandPresetKey): Promise<BrandPresetKey> {
  const { brandPreset } = await updateAppearance({ brandPreset: preset });
  applyBrandPreset(brandPreset);
  return brandPreset;
}

export async function getRadiusPreset(): Promise<RadiusPresetKey> {
  return (await getSettings()).appearance.radiusPreset;
}

export async function updateRadiusPreset(preset: RadiusPresetKey): Promise<RadiusPresetKey> {
  const { radiusPreset } = await updateAppearance({ radiusPreset: preset });
  applyRadiusPreset(radiusPreset);
  return radiusPreset;
}

export async function getDensityPreset(): Promise<DensityPresetKey> {
  return (await getSettings()).appearance.densityPreset;
}

export async function updateDensityPreset(preset: DensityPresetKey): Promise<DensityPresetKey> {
  const { densityPreset } = await updateAppearance({ densityPreset: preset });
  applyDensityPreset(densityPreset);
  return densityPreset;
}

// ── System templates ─────────────────────────────────────────────────────

export async function listSystemTemplates(): Promise<SystemTemplate[]> {
  return (await unwrap(authHttpClient.get<ApiTemplate[]>("/api/settings/templates"))).map(mapTemplate);
}

export async function updateSystemTemplate(id: string, values: SystemTemplateFormValues): Promise<SystemTemplate> {
  return mapTemplate(
    await unwrap(
      authHttpClient.put<ApiTemplate>(`/api/settings/templates/${id}`, { subject: values.subject || null, body: values.body }),
    ),
  );
}

// ── Audit log ────────────────────────────────────────────────────────────

export async function listAuditLog(): Promise<AuditLogEntry[]> {
  const rows = await unwrap(authHttpClient.get<Array<AuditLogEntry & { detail: string | null }>>("/api/settings/audit-log"));
  return rows.map((r) => ({ ...r, detail: r.detail ?? undefined }));
}

// ── Configuration backup / restore ──────────────────────────────────────
// Covers this school's configuration owned by AuthService (profile, localization, appearance,
// message templates, feature toggles). Operational data (students, fees, ...) lives in the other
// services' databases and is backed up at the database level, not through this file.

export async function listBackupHistory(): Promise<BackupEvent[]> {
  return unwrap(authHttpClient.get<BackupEvent[]>("/api/settings/backups"));
}

export async function exportBackup(): Promise<{ filename: string; sizeBytes: number }> {
  const snapshot = await unwrap(authHttpClient.get<unknown>("/api/settings/backups/export"));
  const payload = JSON.stringify(snapshot, null, 2);
  const filename = `educore-config-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([payload], { type: "application/json" });

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);

  return { filename, sizeBytes: blob.size };
}

/** Restores a previously exported configuration file, then reloads so the new appearance applies everywhere. */
export async function restoreBackup(file: File): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await file.text());
  } catch {
    throw new Error("This file isn't a valid backup — it could not be parsed as JSON.");
  }
  if (!parsed || typeof parsed !== "object" || !("profile" in parsed) || !("appearance" in parsed)) {
    throw new Error("This file doesn't look like an EduCore configuration backup.");
  }

  await unwrap(authHttpClient.post<void>("/api/settings/backups/import", parsed));
  window.location.reload();
}
