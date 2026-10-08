import {
  applyBrandPreset, applyDensityPreset, applyRadiusPreset, applyThemeMode, BRAND_PRESETS, getStoredBrandPreset, getStoredDensityPreset, getStoredRadiusPreset, getStoredThemeMode, normalizeBrandPreset,
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

    expect([getStoredBrandPreset(), getStoredRadiusPreset(), getStoredDensityPreset(), getStoredThemeMode()]).toEqual(["green", "rounded", "comfortable", "system"]);
  });

  it("applies a School preset's light-mode roles, favicon and remembers the choice", () => {
    applyBrandPreset("ocean");

    expect(document.documentElement.dataset.style).toBe("school");
    expect(css("--color-brand-600")).toBe("#1f62b5");
    expect(css("--color-primary")).toBe("#1f62b5");
    expect(css("--color-primary-foreground")).toBe("#ffffff");
    expect(css("--color-accent")).toBe("#e6effb");
    expect(css("--color-sidebar")).toBe("#122e57");
    expect(css("--color-sidebar-title")).toBe("#ffffff");
    expect(getStoredBrandPreset()).toBe("ocean");
    const icon = document.head.querySelector<HTMLLinkElement>("link[rel~='icon']")!;
    expect(icon.type).toBe("image/svg+xml");
    expect(icon.href).toMatch(/^data:image\/svg\+xml,/);
  });

  it("keeps the classic presets as they were: brand colours only, original surfaces and sidebar", () => {
    applyBrandPreset("blue");

    expect(document.documentElement.dataset.style).toBe("classic");
    expect(css("--color-brand-500")).toBe(BRAND_PRESETS.blue.shades[500]);
    expect(css("--color-primary")).toBe(BRAND_PRESETS.blue.shades[600]);
    expect(css("--color-primary-foreground")).toBe("#ffffff");
    expect(css("--color-accent")).toBe(BRAND_PRESETS.blue.shades[100]);
    expect(css("--color-sidebar")).toBe("");
    expect(css("--color-background")).toBe("");
  });

  it("switching from a School preset to a classic one clears the School surfaces", () => {
    applyBrandPreset("green");
    expect(css("--color-sidebar")).toBe("#123d29");

    applyBrandPreset("yellow");

    expect(css("--color-sidebar")).toBe("");
    expect(css("--color-sidebar-title")).toBe("");
    expect(css("--color-primary")).toBe("#ECA427");
  });

  it("treats an unknown or retired preset as the default", () => {
    expect(normalizeBrandPreset("neon")).toBe("green");
    expect(normalizeBrandPreset(undefined)).toBe("green");
    expect(normalizeBrandPreset("rose")).toBe("rose");
  });

  it("picks the dark-mode shades when the dark theme is active, and reuses an existing favicon link", () => {
    const existing = document.createElement("link");
    existing.rel = "icon";
    document.head.appendChild(existing);
    document.documentElement.dataset.theme = "dark";

    applyBrandPreset("plum");

    expect(css("--color-primary")).toBe("#ab84dd");
    expect(css("--color-primary-foreground")).toBe("#1a0d2a");
    expect(css("--color-sidebar")).toBe("#140c1e");
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
