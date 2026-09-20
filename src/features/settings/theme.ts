/**
 * Live re-theming: Tailwind v4's `@theme` tokens in index.css are real CSS custom properties
 * on `:root`, not just build-time config (confirmed by dashboard's PerformanceChart already
 * reading `var(--color-brand-500)` directly at runtime). Overriding them on `document.documentElement`
 * therefore cascades into every `bg-brand-*`/`bg-primary`/etc. utility class live, with no rebuild.
 * Framework-agnostic and synchronous on purpose, so it can run once at module scope in App.tsx
 * before the first paint — going through the usual async api.ts + mockDelay pattern here would
 * flash the default theme in first.
 */

export type BrandPresetKey = "blue" | "emerald" | "violet" | "amber" | "rose";

type ShadeKey = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type Shades = Record<ShadeKey, string>;

/** Same lightness/chroma steps as the original blue palette in index.css — only the hue changes. */
const LC: Array<[ShadeKey, number, number]> = [
  [50, 97, 0.014],
  [100, 93, 0.032],
  [200, 86, 0.06],
  [300, 77, 0.1],
  [400, 68, 0.14],
  [500, 58, 0.18],
  [600, 50, 0.19],
  [700, 43, 0.17],
  [800, 36, 0.14],
  [900, 29, 0.11],
];

function shadesFor(hue: number): Shades {
  const result = {} as Shades;
  for (const [key, l, c] of LC) result[key] = `oklch(${l}% ${c} ${hue})`;
  return result;
}

export const BRAND_PRESETS: Record<BrandPresetKey, { label: string; hue: number; shades: Shades }> = {
  blue: { label: "Blue (default)", hue: 264, shades: shadesFor(264) },
  emerald: { label: "Emerald", hue: 160, shades: shadesFor(160) },
  violet: { label: "Violet", hue: 300, shades: shadesFor(300) },
  amber: { label: "Amber", hue: 80, shades: shadesFor(80) },
  rose: { label: "Rose", hue: 20, shades: shadesFor(20) },
};

const STORAGE_KEY = "sms-settings-brand-preset";

export function getStoredBrandPreset(): BrandPresetKey {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw in BRAND_PRESETS) return raw as BrandPresetKey;
  } catch {
    // fall through to default
  }
  return "blue";
}

function isDarkActive(): boolean {
  return document.documentElement.dataset.theme === "dark";
}

export function applyBrandPreset(preset: BrandPresetKey): void {
  const { shades } = BRAND_PRESETS[preset];
  const root = document.documentElement.style;
  (Object.keys(shades) as unknown as ShadeKey[]).forEach((key) => {
    root.setProperty(`--color-brand-${key}`, shades[key]);
  });
  // A dark background needs a lighter, more saturated-looking shade to read as "primary" —
  // the same 600/500/100/700 indices used in light mode would look muddy and low-contrast here.
  const dark = isDarkActive();
  root.setProperty("--color-primary", shades[dark ? 400 : 600]);
  root.setProperty("--color-ring", shades[dark ? 400 : 500]);
  root.setProperty("--color-accent", dark ? shades[800] : shades[100]);
  root.setProperty("--color-accent-foreground", dark ? shades[200] : shades[700]);
  root.setProperty("--color-sidebar-accent", dark ? shades[800] : shades[100]);
  root.setProperty("--color-sidebar-accent-foreground", dark ? shades[200] : shades[700]);

  try {
    localStorage.setItem(STORAGE_KEY, preset);
  } catch {
    // best-effort only
  }
}

// ── Corner style ─────────────────────────────────────────────────────────

export type RadiusPresetKey = "sharp" | "rounded" | "pill";

export const RADIUS_PRESETS: Record<RadiusPresetKey, { label: string; base: string }> = {
  sharp: { label: "Sharp", base: "0.25rem" },
  rounded: { label: "Rounded", base: "0.625rem" },
  pill: { label: "Pill", base: "1.125rem" },
};

const RADIUS_STORAGE_KEY = "sms-settings-radius-preset";

export function getStoredRadiusPreset(): RadiusPresetKey {
  try {
    const raw = localStorage.getItem(RADIUS_STORAGE_KEY);
    if (raw && raw in RADIUS_PRESETS) return raw as RadiusPresetKey;
  } catch {
    // fall through to default
  }
  return "rounded";
}

/** Only ever has to set one custom property — --radius-sm/md/lg/xl already derive from --radius via calc() in index.css. */
export function applyRadiusPreset(preset: RadiusPresetKey): void {
  document.documentElement.style.setProperty("--radius", RADIUS_PRESETS[preset].base);
  try {
    localStorage.setItem(RADIUS_STORAGE_KEY, preset);
  } catch {
    // best-effort only
  }
}

// ── Density ──────────────────────────────────────────────────────────────

export type DensityPresetKey = "comfortable" | "compact";

export const DENSITY_PRESETS: Record<DensityPresetKey, { label: string; cardPadding: string; rowPaddingY: string; rowPaddingX: string }> = {
  comfortable: { label: "Comfortable", cardPadding: "1.25rem", rowPaddingY: "0.625rem", rowPaddingX: "1rem" },
  compact: { label: "Compact", cardPadding: "0.875rem", rowPaddingY: "0.375rem", rowPaddingX: "0.75rem" },
};

const DENSITY_STORAGE_KEY = "sms-settings-density-preset";

export function getStoredDensityPreset(): DensityPresetKey {
  try {
    const raw = localStorage.getItem(DENSITY_STORAGE_KEY);
    if (raw && raw in DENSITY_PRESETS) return raw as DensityPresetKey;
  } catch {
    // fall through to default
  }
  return "comfortable";
}

export function applyDensityPreset(preset: DensityPresetKey): void {
  const { cardPadding, rowPaddingY, rowPaddingX } = DENSITY_PRESETS[preset];
  const root = document.documentElement.style;
  root.setProperty("--space-card-padding", cardPadding);
  root.setProperty("--space-row-padding-y", rowPaddingY);
  root.setProperty("--space-row-padding-x", rowPaddingX);
  try {
    localStorage.setItem(DENSITY_STORAGE_KEY, preset);
  } catch {
    // best-effort only
  }
}

// ── Theme mode (light / dark / system) ──────────────────────────────────
// Per-user, not per-tenant — lives in useUiStore (zustand + persist) alongside
// isSidebarCollapsed, not in the tenant-scoped settings API the other three presets use.

export type ThemeMode = "light" | "dark" | "system";

let systemThemeListenerAttached = false;

/** Resolves "system" via prefers-color-scheme and sets the data-theme attribute that
 *  :root[data-theme="dark"] in index.css and the `dark:` custom variant both key off. */
export function applyThemeMode(mode: ThemeMode): void {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const resolveDark = () => (mode === "system" ? media.matches : mode === "dark");
  document.documentElement.dataset.theme = resolveDark() ? "dark" : "light";

  if (mode === "system" && !systemThemeListenerAttached) {
    systemThemeListenerAttached = true;
    media.addEventListener("change", () => {
      // Only re-resolve if still in "system" mode by the time the OS setting changes —
      // useUiStore's persisted value is the source of truth for "am I still in system mode".
      if (getStoredThemeMode() === "system") {
        document.documentElement.dataset.theme = media.matches ? "dark" : "light";
      }
    });
  }
}

/** Synchronous localStorage read of useUiStore's own persisted shape, for the same
 *  before-first-paint reason getStoredBrandPreset() exists — reading via the zustand store's
 *  React hook isn't available yet at App.tsx's module scope. */
export function getStoredThemeMode(): ThemeMode {
  try {
    const raw = localStorage.getItem("sms-ui");
    if (!raw) return "system";
    const parsed = JSON.parse(raw) as { state?: { themeMode?: ThemeMode } };
    const mode = parsed.state?.themeMode;
    if (mode === "light" || mode === "dark" || mode === "system") return mode;
  } catch {
    // fall through to default
  }
  return "system";
}
