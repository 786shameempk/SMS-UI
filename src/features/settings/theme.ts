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

export function applyBrandPreset(preset: BrandPresetKey): void {
  const { shades } = BRAND_PRESETS[preset];
  const root = document.documentElement.style;
  (Object.keys(shades) as unknown as ShadeKey[]).forEach((key) => {
    root.setProperty(`--color-brand-${key}`, shades[key]);
  });
  root.setProperty("--color-primary", shades[600]);
  root.setProperty("--color-ring", shades[500]);
  root.setProperty("--color-accent", shades[100]);
  root.setProperty("--color-accent-foreground", shades[700]);
  root.setProperty("--color-sidebar-accent", shades[100]);
  root.setProperty("--color-sidebar-accent-foreground", shades[700]);

  try {
    localStorage.setItem(STORAGE_KEY, preset);
  } catch {
    // best-effort only
  }
}
