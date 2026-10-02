import {
  applyBrandPreset, applyDensityPreset, applyRadiusPreset, applyThemeMode, BRAND_PRESETS, getStoredBrandPreset, getStoredDensityPreset, getStoredRadiusPreset, getStoredThemeMode,
} from "./theme";

const css = (name: string) => document.documentElement.style.getPropertyValue(name);

describe("live theming", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
    delete document.documentElement.dataset.theme;
    document.head.querySelectorAll("link[rel~='icon']").forEach((l) => l.remove());
  });

  it("falls back to the defaults when nothing valid is stored", () => {
    localStorage.setItem("sms-settings-brand-preset", "neon");
    localStorage.setItem("sms-ui", "{broken");

    expect([getStoredBrandPreset(), getStoredRadiusPreset(), getStoredDensityPreset(), getStoredThemeMode()]).toEqual(["yellow", "rounded", "comfortable", "system"]);
  });

  it("applies a brand preset's light-mode roles, favicon and remembers the choice", () => {
    applyBrandPreset("blue");

    expect(css("--color-brand-500")).toBe(BRAND_PRESETS.blue.shades[500]);
    expect(css("--color-primary")).toBe(BRAND_PRESETS.blue.shades[600]);
    expect(css("--color-primary-foreground")).toBe("#ffffff");
    expect(css("--color-accent")).toBe(BRAND_PRESETS.blue.shades[100]);
    expect(getStoredBrandPreset()).toBe("blue");
    const icon = document.head.querySelector<HTMLLinkElement>("link[rel~='icon']")!;
    expect(icon.type).toBe("image/svg+xml");
    expect(icon.href).toMatch(/^data:image\/svg\+xml,/);
  });

  it("picks the dark-mode shades when the dark theme is active, and reuses an existing favicon link", () => {
    const existing = document.createElement("link");
    existing.rel = "icon";
    document.head.appendChild(existing);
    document.documentElement.dataset.theme = "dark";

    applyBrandPreset("yellow");

    expect(css("--color-primary")).toBe("#ECA427");
    expect(css("--color-primary-foreground")).toContain("color-mix");
    expect(css("--color-accent")).toBe(BRAND_PRESETS.yellow.shades[900]);
    expect(document.head.querySelectorAll("link[rel~='icon']")).toHaveLength(1);
  });

  it("applies and remembers radius and density", () => {
    applyRadiusPreset("pill");
    applyDensityPreset("compact");

    expect(css("--radius")).toBe("1.125rem");
    expect(css("--space-row-padding-y")).toBe("0.375rem");
    expect([getStoredRadiusPreset(), getStoredDensityPreset()]).toEqual(["pill", "compact"]);
  });

  it("resolves light, dark and system modes and follows OS changes only while in system mode", () => {
    let listener: (() => void) | undefined;
    const media = { matches: true, addEventListener: vi.fn((_: string, cb: () => void) => (listener = cb)) };
    vi.spyOn(window, "matchMedia").mockReturnValue(media as never);

    applyThemeMode("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    applyThemeMode("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");

    localStorage.setItem("sms-ui", JSON.stringify({ state: { themeMode: "system" } }));
    applyThemeMode("system");
    applyThemeMode("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(media.addEventListener).toHaveBeenCalledTimes(1);

    media.matches = false;
    listener!();
    expect(document.documentElement.dataset.theme).toBe("light");

    localStorage.setItem("sms-ui", JSON.stringify({ state: { themeMode: "dark" } }));
    document.documentElement.dataset.theme = "dark";
    listener!();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getStoredThemeMode()).toBe("dark");
  });
});
