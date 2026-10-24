/**
 * Interface languages. Adding one: add an entry here and a `locales/<code>/` folder; untranslated text falls back to English.
 */
export interface LanguageDefinition {
  code: string;
  /** In the language itself, for the picker. */
  nativeName: string;
  englishName: string;
  dir: "ltr" | "rtl";
  /** BCP 47 locale for dates, numbers and currency. */
  locale: string;
  /** Google Fonts family covering the script (null = Inter is enough). */
  font: string | null;
}

export const LANGUAGES: LanguageDefinition[] = [
  { code: "en", nativeName: "English", englishName: "English", dir: "ltr", locale: "en-IN", font: null },
  { code: "ml", nativeName: "മലയാളം", englishName: "Malayalam", dir: "ltr", locale: "ml-IN", font: "Noto Sans Malayalam" },
  { code: "hi", nativeName: "हिन्दी", englishName: "Hindi", dir: "ltr", locale: "hi-IN", font: "Noto Sans Devanagari" },
  { code: "ta", nativeName: "தமிழ்", englishName: "Tamil", dir: "ltr", locale: "ta-IN", font: "Noto Sans Tamil" },
  { code: "ar", nativeName: "العربية", englishName: "Arabic", dir: "rtl", locale: "ar", font: "Noto Sans Arabic" },
];

export const DEFAULT_LANGUAGE = "en";

/** "hi-IN" / "HI" → "hi"; anything unsupported → null. */
export function normalizeLanguage(value: string | null | undefined): string | null {
  if (!value) return null;
  const code = value.split(/[-_]/)[0].toLowerCase();
  return LANGUAGES.some((l) => l.code === code) ? code : null;
}

export function languageInfo(code: string | null | undefined): LanguageDefinition {
  return LANGUAGES.find((l) => l.code === normalizeLanguage(code)) ?? LANGUAGES[0];
}
