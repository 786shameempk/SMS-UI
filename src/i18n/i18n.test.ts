import { describe, expect, it } from "vitest";
import { LANGUAGES, languageInfo, normalizeLanguage } from "./languages";

const files = import.meta.glob<Record<string, string>>("./locales/*/*.json", { eager: true, import: "default" });
const placeholders = (text: string) => (text.match(/\{\{\s*\w+\s*\}\}/g) ?? []).map((p) => p.replace(/\s/g, "")).sort();

describe("languages", () => {
  it("normalises regional codes and rejects unsupported ones", () => {
    expect(normalizeLanguage("hi-IN")).toBe("hi");
    expect(normalizeLanguage("AR")).toBe("ar");
    expect(normalizeLanguage("xx")).toBeNull();
    expect(normalizeLanguage(null)).toBeNull();
  });

  it("falls back to English and marks Arabic right-to-left", () => {
    expect(languageInfo("zz").code).toBe("en");
    expect(languageInfo("ar").dir).toBe("rtl");
    expect(LANGUAGES.filter((l) => l.dir === "rtl").map((l) => l.code)).toEqual(["ar"]);
  });
});

describe("translation files", () => {
  const entries = Object.entries(files).map(([path, data]) => {
    const [, language, namespace] = /\.\/locales\/(\w+)\/(.+)\.json$/.exec(path)!;
    return { path, language, namespace, data };
  });

  it("exist for every non-English language", () => {
    for (const lang of LANGUAGES.filter((l) => l.code !== "en")) {
      expect(entries.some((e) => e.language === lang.code)).toBe(true);
    }
  });

  it("have the same namespaces in every language", () => {
    const byLanguage = (code: string) => entries.filter((e) => e.language === code).map((e) => e.namespace).sort();
    const reference = byLanguage("ml");
    for (const code of ["hi", "ta", "ar"]) expect(byLanguage(code)).toEqual(reference);
  });

  it("keep every {{placeholder}} of the English text and never leave a value empty", () => {
    const problems: string[] = [];
    for (const { path, data } of entries) {
      for (const [key, value] of Object.entries(data)) {
        if (typeof value !== "string" || value.trim() === "") problems.push(`${path}: empty "${key}"`);
        else if (placeholders(key).join() !== placeholders(value).join()) problems.push(`${path}: placeholders differ in "${key}"`);
      }
    }
    expect(problems).toEqual([]);
  });
});
