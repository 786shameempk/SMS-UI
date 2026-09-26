/**
 * Live re-theming: Tailwind v4's `@theme` tokens in index.css are real CSS custom properties
 * on `:root`, not just build-time config (confirmed by dashboard's PerformanceChart already
 * reading `var(--color-brand-500)` directly at runtime). Overriding them on `document.documentElement`
 * therefore cascades into every `bg-brand-*`/`bg-primary`/etc. utility class live, with no rebuild.
 * Framework-agnostic and synchronous on purpose, so it can run once at module scope in App.tsx
 * before the first paint — waiting on the async settings API here would
 * flash the default theme in first.
 */

export type BrandPresetKey = "blue" | "emerald" | "violet" | "amber" | "yellow" | "rose";

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

/**
 * Yellow palette built around #ECA427, kept as exact hex values rather than an oklch approximation.
 * #ECA427 sits on 500 — the primary/ring shade — not on 600 like the generated ramps.
 */
const YELLOW: Shades = {
  50: "#FDF9EE",
  100: "#FBF1D5",
  200: "#F6E0A6",
  300: "#F0CA6E",
  400: "#EDB445",
  500: "#ECA427",
  600: "#D18818",
  700: "#A06212",
  800: "#724212",
  900: "#492911",
};

function shadesFor(hue: number): Shades {
  const result = {} as Shades;
  for (const [key, l, c] of LC) result[key] = `oklch(${l}% ${c} ${hue})`;
  return result;
}

/** Which shade each semantic token takes, per mode. */
interface BrandRoles {
  primary: ShadeKey;
  /** Hover shade for primary buttons. */
  primaryHover: ShadeKey;
  /** Readable brand-coloured text/links on the page surface. */
  primaryText: ShadeKey;
  /** Ink on a primary fill: "light" (white) or "dark" (brand-900-ish), whichever passes contrast. */
  onPrimary: "light" | "dark";
  ring: ShadeKey;
  accent: ShadeKey;
  accentForeground: ShadeKey;
}

const DEFAULT_ROLES: Record<"light" | "dark", BrandRoles> = {
  light: { primary: 600, primaryHover: 700, primaryText: 700, onPrimary: "light", ring: 500, accent: 100, accentForeground: 700 },
  // A dark background needs a lighter, more saturated-looking shade to read as "primary" —
  // the same 600/500/100/700 indices used in light mode would look muddy and low-contrast here.
  dark: { primary: 400, primaryHover: 300, primaryText: 300, onPrimary: "dark", ring: 400, accent: 800, accentForeground: 200 },
};

/** Yellow's combination: primary and ring are #ECA427 itself in both modes, with a
 *  barely-tinted 50 accent and 700 amber-brown text for active nav/menu items in light mode. */
const YELLOW_ROLES: Record<"light" | "dark", BrandRoles> = {
  light: { primary: 500, primaryHover: 600, primaryText: 700, onPrimary: "dark", ring: 500, accent: 50, accentForeground: 700 },
  dark: { primary: 500, primaryHover: 400, primaryText: 300, onPrimary: "dark", ring: 500, accent: 900, accentForeground: 200 },
};

export const BRAND_PRESETS: Record<BrandPresetKey, { label: string; shades: Shades; roles: Record<"light" | "dark", BrandRoles> }> = {
  yellow: { label: "Yellow (default)", shades: YELLOW, roles: YELLOW_ROLES },
  blue: { label: "Blue", shades: shadesFor(264), roles: DEFAULT_ROLES },
  emerald: { label: "Emerald", shades: shadesFor(160), roles: DEFAULT_ROLES },
  violet: { label: "Violet", shades: shadesFor(300), roles: DEFAULT_ROLES },
  amber: { label: "Amber", shades: shadesFor(80), roles: DEFAULT_ROLES },
  rose: { label: "Rose", shades: shadesFor(20), roles: DEFAULT_ROLES },
};

const STORAGE_KEY = "sms-settings-brand-preset";

export function getStoredBrandPreset(): BrandPresetKey {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && raw in BRAND_PRESETS) return raw as BrandPresetKey;
  } catch {
    // fall through to default
  }
  return "yellow";
}

function isDarkActive(): boolean {
  return document.documentElement.dataset.theme === "dark";
}

/** Resolves any CSS color (hex, oklch(), …) to #rrggbb by painting one canvas pixel, so the favicon
 *  SVG below never depends on the browser's favicon renderer understanding oklch(). */
function toHexColor(color: string): string {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return color;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;
}

/** Re-tints the browser-tab icon to the active brand preset. Same mark as public/favicon.svg (the static
 *  default served before JS runs) and the sidebar logo: a brand-500 → brand-700 tile with a GraduationCap. */
function applyBrandFavicon(from: string, to: string): void {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 32 32"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${toHexColor(from)}"/><stop offset="1" stop-color="${toHexColor(to)}"/></linearGradient></defs><rect width="32" height="32" rx="8" fill="url(#g)"/><g transform="translate(5 5) scale(0.9167)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></g></svg>`;

  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.type = "image/svg+xml";
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function applyBrandPreset(preset: BrandPresetKey): void {
  const { shades, roles } = BRAND_PRESETS[preset];
  const root = document.documentElement.style;
  (Object.keys(shades) as unknown as ShadeKey[]).forEach((key) => {
    root.setProperty(`--color-brand-${key}`, shades[key]);
  });
  const r = roles[isDarkActive() ? "dark" : "light"];
  root.setProperty("--color-primary", shades[r.primary]);
  root.setProperty("--color-primary-hover", shades[r.primaryHover]);
  root.setProperty("--color-primary-text", shades[r.primaryText]);
  // Dark ink is the 900 shade darkened further, so it stays warm-tinted but passes contrast.
  root.setProperty(
    "--color-primary-foreground",
    r.onPrimary === "light" ? "#ffffff" : `color-mix(in oklab, ${shades[900]} 70%, black)`,
  );
  root.setProperty("--color-ring", shades[r.ring]);
  root.setProperty("--color-accent", shades[r.accent]);
  root.setProperty("--color-accent-foreground", shades[r.accentForeground]);
  root.setProperty("--color-sidebar-accent", shades[r.accent]);
  root.setProperty("--color-sidebar-accent-foreground", shades[r.accentForeground]);
  applyBrandFavicon(shades[500], shades[700]);

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
  comfortable: { label: "Comfortable", cardPadding: "1.25rem", rowPaddingY: "0.75rem", rowPaddingX: "1rem" },
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
  // Brand roles are mode-specific inline properties, so they must be re-picked on every mode flip.
  applyBrandPreset(getStoredBrandPreset());

  if (mode === "system" && !systemThemeListenerAttached) {
    systemThemeListenerAttached = true;
    media.addEventListener("change", () => {
      // Only re-resolve if still in "system" mode by the time the OS setting changes —
      // useUiStore's persisted value is the source of truth for "am I still in system mode".
      if (getStoredThemeMode() === "system") {
        document.documentElement.dataset.theme = media.matches ? "dark" : "light";
        applyBrandPreset(getStoredBrandPreset());
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
