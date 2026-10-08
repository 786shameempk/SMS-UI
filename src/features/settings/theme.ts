/**
 * Live re-theming: Tailwind v4's `@theme` tokens in index.css are real CSS custom properties
 * on `:root`, not just build-time config (confirmed by dashboard's PerformanceChart already
 * reading `var(--color-brand-500)` directly at runtime). Overriding them on `document.documentElement`
 * therefore cascades into every `bg-brand-*`/`bg-primary`/etc. utility class live, with no rebuild.
 * Framework-agnostic and synchronous on purpose, so it can run once at module scope in App.tsx
 * before the first paint — waiting on the async settings API here would
 * flash the default theme in first.
 */

/** `school`: the School ERP design-system palettes (deep-brand sidebar, tinted surfaces).
 *  `classic`: the original brand colours on the original neutral surfaces and light sidebar. */
export type ThemeStyle = "school" | "classic";

export type SchoolPresetKey = "green" | "ocean" | "plum" | "slate";
export type ClassicPresetKey = "yellow" | "blue" | "emerald" | "violet" | "amber" | "rose";
export type BrandPresetKey = SchoolPresetKey | ClassicPresetKey;

type ShadeKey = 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
type Shades = Record<ShadeKey, string>;

// ── Classic palettes (unchanged from before the School ERP refresh) ──────────────────────────

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

function shadesForHue(hue: number): Shades {
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

const CLASSIC: Record<ClassicPresetKey, { label: string; shades: Shades; roles: Record<"light" | "dark", BrandRoles> }> = {
  yellow: { label: "Yellow", shades: YELLOW, roles: YELLOW_ROLES },
  blue: { label: "Blue", shades: shadesForHue(264), roles: DEFAULT_ROLES },
  emerald: { label: "Emerald", shades: shadesForHue(160), roles: DEFAULT_ROLES },
  violet: { label: "Violet", shades: shadesForHue(300), roles: DEFAULT_ROLES },
  amber: { label: "Amber", shades: shadesForHue(80), roles: DEFAULT_ROLES },
  rose: { label: "Rose", shades: shadesForHue(20), roles: DEFAULT_ROLES },
};

// ── School palettes (Claude Design system) ───────────────────────────────────────────────────

/** One palette in one mode, straight from the School ERP design system (tokens.json) — the field names
 *  are the design's token names. Only brand, sidebar, focus and the surface tints differ between palettes. */
interface PaletteMode {
  surface50: string; // app background
  surface0: string; // cards, inputs
  surface100: string; // table headers, hover rows
  line: string;
  lineStrong: string; // control borders
  ink: string;
  inkMuted: string;
  brand50: string;
  brand600: string;
  brand700: string;
  onBrand: string;
  sidebar: string;
  onSidebar: string;
  focusRing: string;
  /** Amber accent; Slate & Saffron uses a warmer one. */
  accent500?: string;
}

/** The neutral surface set shared by Ocean Blue, Royal Plum and Slate & Saffron. */
const COOL_DARK = {
  surface50: "#0f1217", surface0: "#171b22", surface100: "#212630", line: "#2e3440", lineStrong: "#606b7b", ink: "#e8ecf2", inkMuted: "#a2acba",
};
const COOL_LIGHT = { surface0: "#ffffff", lineStrong: "#7d8796", ink: "#161b24", inkMuted: "#545f6e" };

const SCHOOL: Record<SchoolPresetKey, { label: string; light: PaletteMode; dark: PaletteMode }> = {
  green: {
    label: "Green",
    light: {
      surface50: "#f5f7f5", surface0: "#ffffff", surface100: "#ebf0ec", line: "#dbe3dd", lineStrong: "#7f9086", ink: "#16201b", inkMuted: "#56655c",
      brand50: "#e5f3eb", brand600: "#1d7a4c", brand700: "#15603b", onBrand: "#ffffff", sidebar: "#123d29", onSidebar: "#d6eadf", focusRing: "#2f8f5e",
    },
    dark: {
      surface50: "#0e1311", surface0: "#161c19", surface100: "#1f2724", line: "#2c3632", lineStrong: "#5f6f67", ink: "#e7eee9", inkMuted: "#9eafa5",
      brand50: "#163226", brand600: "#45b37b", brand700: "#6fcb9a", onBrand: "#0a1d13", sidebar: "#0b1712", onSidebar: "#c9ddd2", focusRing: "#6fcb9a",
    },
  },
  ocean: {
    label: "Ocean Blue",
    light: {
      ...COOL_LIGHT, surface50: "#f4f7fb", surface100: "#e8eef7", line: "#d8e1ed",
      brand50: "#e6effb", brand600: "#1f62b5", brand700: "#174c8e", onBrand: "#ffffff", sidebar: "#122e57", onSidebar: "#d6e3f5", focusRing: "#2a6fc4",
    },
    dark: { ...COOL_DARK, brand50: "#16294a", brand600: "#5d9be6", brand700: "#94c0f2", onBrand: "#0a1a2e", sidebar: "#0a1424", onSidebar: "#c8d6e8", focusRing: "#94c0f2" },
  },
  plum: {
    label: "Royal Plum",
    light: {
      ...COOL_LIGHT, surface50: "#f7f5fa", surface100: "#eee9f4", line: "#e1dae9",
      brand50: "#f2ebf9", brand600: "#6e3fa5", brand700: "#552f82", onBrand: "#ffffff", sidebar: "#33204c", onSidebar: "#e6dbf2", focusRing: "#7c4db6",
    },
    dark: { ...COOL_DARK, brand50: "#2b1d3b", brand600: "#ab84dd", brand700: "#cbadf0", onBrand: "#1a0d2a", sidebar: "#140c1e", onSidebar: "#d9cde6", focusRing: "#cbadf0" },
  },
  slate: {
    label: "Slate & Saffron",
    light: {
      ...COOL_LIGHT, surface50: "#f5f6f8", surface100: "#eaedf1", line: "#dce1e7", accent500: "#f2a516",
      brand50: "#edf0f4", brand600: "#334155", brand700: "#1e293b", onBrand: "#ffffff", sidebar: "#1e293b", onSidebar: "#dbe2ea", focusRing: "#b86e00",
    },
    dark: { ...COOL_DARK, accent500: "#f2a516", brand50: "#232b37", brand600: "#b4c0d0", brand700: "#d5dde8", onBrand: "#0f172a", sidebar: "#0b1018", onSidebar: "#cfd8e3", focusRing: "#f3bf6e" },
  },
};

const GREEN_SHADES: Shades = {
  50: "#E5F3EB", 100: "#CDEEDD", 200: "#A4DFC0", 300: "#6FCB9A", 400: "#45B37B", 500: "#2F8F5E", 600: "#1D7A4C", 700: "#15603B", 800: "#14402A", 900: "#0B3522",
};

/** The `brand-*` utility ramp (bg-brand-100, text-brand-700 …) is built from the palette's light 50/600/700 and is the same in
 *  both modes; the mode-specific roles (primary, sidebar …) come from PaletteMode instead. */
function schoolShades(key: SchoolPresetKey): Shades {
  if (key === "green") return GREEN_SHADES;
  const { brand50, brand600, brand700 } = SCHOOL[key].light;
  const mix = (pct: number, base: string, other: string) => `color-mix(in oklab, ${base} ${pct}%, ${other})`;
  return {
    50: brand50,
    100: mix(14, brand600, "white"),
    200: mix(28, brand600, "white"),
    300: mix(48, brand600, "white"),
    400: mix(70, brand600, "white"),
    500: mix(85, brand600, "white"),
    600: brand600,
    700: brand700,
    800: mix(78, brand700, "black"),
    900: mix(55, brand700, "black"),
  };
}

export const BRAND_PRESETS: Record<BrandPresetKey, { label: string; style: ThemeStyle; shades: Shades; swatch: string }> = {
  green: { label: SCHOOL.green.label, style: "school", shades: schoolShades("green"), swatch: SCHOOL.green.light.brand600 },
  ocean: { label: SCHOOL.ocean.label, style: "school", shades: schoolShades("ocean"), swatch: SCHOOL.ocean.light.brand600 },
  plum: { label: SCHOOL.plum.label, style: "school", shades: schoolShades("plum"), swatch: SCHOOL.plum.light.brand600 },
  slate: { label: SCHOOL.slate.label, style: "school", shades: schoolShades("slate"), swatch: SCHOOL.slate.light.brand600 },
  yellow: { label: CLASSIC.yellow.label, style: "classic", shades: CLASSIC.yellow.shades, swatch: CLASSIC.yellow.shades[500] },
  blue: { label: CLASSIC.blue.label, style: "classic", shades: CLASSIC.blue.shades, swatch: CLASSIC.blue.shades[500] },
  emerald: { label: CLASSIC.emerald.label, style: "classic", shades: CLASSIC.emerald.shades, swatch: CLASSIC.emerald.shades[500] },
  violet: { label: CLASSIC.violet.label, style: "classic", shades: CLASSIC.violet.shades, swatch: CLASSIC.violet.shades[500] },
  amber: { label: CLASSIC.amber.label, style: "classic", shades: CLASSIC.amber.shades, swatch: CLASSIC.amber.shades[500] },
  rose: { label: CLASSIC.rose.label, style: "classic", shades: CLASSIC.rose.shades, swatch: CLASSIC.rose.shades[500] },
};

const STORAGE_KEY = "sms-settings-brand-preset";
const DEFAULT_PRESET: BrandPresetKey = "green";

/** Anything that isn't a known preset reads as the default. */
export function normalizeBrandPreset(value: string | null | undefined): BrandPresetKey {
  return value && Object.prototype.hasOwnProperty.call(BRAND_PRESETS, value) ? (value as BrandPresetKey) : DEFAULT_PRESET;
}

export function getStoredBrandPreset(): BrandPresetKey {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw && Object.prototype.hasOwnProperty.call(BRAND_PRESETS, raw)) return raw as BrandPresetKey;
  } catch {
    // fall through to default
  }
  return DEFAULT_PRESET;
}

function isDarkActive(): boolean {
  return document.documentElement.dataset.theme === "dark";
}

/** Everything a preset sets on :root, for one mode, as property → value. */
function presetProps(key: BrandPresetKey, dark: boolean): Record<string, string> {
  const shades = BRAND_PRESETS[key].shades;
  const props: Record<string, string> = {};
  for (const k of Object.keys(shades) as unknown as ShadeKey[]) props[`--color-brand-${k}`] = shades[k];

  if (BRAND_PRESETS[key].style === "classic") {
    const r = CLASSIC[key as ClassicPresetKey].roles[dark ? "dark" : "light"];
    props["--color-primary"] = shades[r.primary];
    props["--color-primary-hover"] = shades[r.primaryHover];
    props["--color-primary-text"] = shades[r.primaryText];
    // Dark ink is the 900 shade darkened further, so it stays warm-tinted but passes contrast.
    props["--color-primary-foreground"] = r.onPrimary === "light" ? "#ffffff" : `color-mix(in oklab, ${shades[900]} 70%, black)`;
    props["--color-ring"] = shades[r.ring];
    props["--color-accent"] = shades[r.accent];
    props["--color-accent-foreground"] = shades[r.accentForeground];
    props["--color-sidebar-accent"] = shades[r.accent];
    props["--color-sidebar-accent-foreground"] = shades[r.accentForeground];
    return props;
  }

  const m = SCHOOL[key as SchoolPresetKey][dark ? "dark" : "light"];
  Object.assign(props, {
    "--color-background": m.surface50,
    "--color-card": m.surface0,
    "--color-card-foreground": m.ink,
    "--color-popover": m.surface0,
    "--color-popover-foreground": m.ink,
    "--color-foreground": m.ink,
    "--color-secondary": m.surface100,
    "--color-secondary-foreground": `color-mix(in oklab, ${m.ink} 82%, ${m.surface0})`,
    "--color-muted": `color-mix(in oklab, ${m.surface100} 60%, ${m.surface0})`,
    "--color-muted-foreground": m.inkMuted,
    "--color-border": m.line,
    "--color-input": m.lineStrong,
    "--color-primary": m.brand600,
    "--color-primary-hover": m.brand700,
    "--color-primary-text": m.brand700,
    "--color-primary-foreground": m.onBrand,
    "--color-accent": m.brand50,
    "--color-accent-foreground": m.brand700,
    "--color-ring": m.focusRing,
    "--color-warning": m.accent500 ?? "#e9a13b",
    // The sidebar is the one deep block of every screen; its active item is the primary fill.
    "--color-sidebar": m.sidebar,
    "--color-sidebar-foreground": m.onSidebar,
    "--color-sidebar-title": "#ffffff",
    "--color-sidebar-muted": `color-mix(in oklab, ${m.onSidebar} 62%, ${m.sidebar})`,
    "--color-sidebar-hover": "rgb(255 255 255 / 0.08)",
    "--color-sidebar-hover-foreground": "#ffffff",
    "--color-sidebar-border": "rgb(255 255 255 / 0.1)",
    "--color-sidebar-accent": m.brand600,
    "--color-sidebar-accent-foreground": m.onBrand,
  });
  return props;
}

/** Properties only the School palettes set; a classic preset removes them so the stylesheet's original neutrals show again. */
const SCHOOL_ONLY_PROPS = Object.keys(presetProps("green", false)).filter((p) => !Object.keys(presetProps("yellow", false)).includes(p));

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

export function applyBrandPreset(requested: BrandPresetKey): void {
  const preset = normalizeBrandPreset(requested);
  const { style, shades } = BRAND_PRESETS[preset];
  const el = document.documentElement;
  el.dataset.style = style;
  for (const prop of SCHOOL_ONLY_PROPS) el.style.removeProperty(prop);
  for (const [prop, value] of Object.entries(presetProps(preset, isDarkActive()))) el.style.setProperty(prop, value);
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

// ── Landing page ─────────────────────────────────────────────────────────

/** Pins the public landing page to the amber (yellow) brand in light mode, whatever the visitor picked in
 *  Settings. Unlike applyBrandPreset/applyThemeMode it persists nothing; the returned function puts the
 *  user's own theme back, so it's safe to call on mount and clean up on unmount. */
export function applyLandingTheme(): () => void {
  const el = document.documentElement;
  const prevTheme = el.dataset.theme;
  const prevStyle = el.dataset.style;
  const props = presetProps("yellow", false);
  const touched = [...new Set([...Object.keys(props), ...SCHOOL_ONLY_PROPS])];
  const prev = touched.map((p) => [p, el.style.getPropertyValue(p)] as const);

  el.dataset.theme = "light";
  el.dataset.style = "classic";
  for (const prop of SCHOOL_ONLY_PROPS) el.style.removeProperty(prop);
  for (const [prop, value] of Object.entries(props)) el.style.setProperty(prop, value);

  return () => {
    if (prevTheme === undefined) delete el.dataset.theme;
    else el.dataset.theme = prevTheme;
    if (prevStyle === undefined) delete el.dataset.style;
    else el.dataset.style = prevStyle;
    for (const [p, v] of prev) {
      if (v) el.style.setProperty(p, v);
      else el.style.removeProperty(p);
    }
  };
}
