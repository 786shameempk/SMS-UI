import i18n, { type BackendModule, type ReadCallback } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, languageInfo, normalizeLanguage } from "./languages";

/**
 * Keys are the English text itself ("Save changes"), so a string that has no translation yet shows in English, never
 * as a raw key. Each module has its own namespace file per language under ./locales/<lng>/<ns>.json, loaded on demand.
 * Plural forms use i18next's suffixes (key_one / key_other) and live in the English files too.
 */
const loaders = import.meta.glob<{ default: Record<string, string> }>("./locales/*/*.json");

const lazyBackend: BackendModule = {
  type: "backend",
  init: () => undefined,
  read(language: string, namespace: string, callback: ReadCallback) {
    const load = loaders[`./locales/${language}/${namespace}.json`];
    if (!load) return callback(null, {});
    load()
      .then((m) => callback(null, m.default))
      .catch(() => callback(null, {}));
  },
};

/** Namespaces used by the app shell; feature modules load theirs when their screens use them. */
export const SHELL_NAMESPACES = ["common", "nav"];

/** The language this browser last used (the user's choice, or the school default once known). Read before first paint. */
export function storedLanguage(): string {
  try {
    const raw = localStorage.getItem("sms-ui");
    const parsed = raw ? (JSON.parse(raw) as { state?: { language?: string | null; resolvedLanguage?: string | null } }) : null;
    return normalizeLanguage(parsed?.state?.language) ?? normalizeLanguage(parsed?.state?.resolvedLanguage) ?? DEFAULT_LANGUAGE;
  } catch {
    return DEFAULT_LANGUAGE;
  }
}

const loadedFonts = new Set<string>();

/** Sets <html lang dir>, loads the script's font, and switches the interface language. */
export async function applyLanguage(code: string): Promise<void> {
  const info = languageInfo(code);
  const root = document.documentElement;
  root.lang = info.code;
  root.dir = info.dir;
  if (info.font && !loadedFonts.has(info.font)) {
    loadedFonts.add(info.font);
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(info.font)}:wght@400;500;600;700&display=swap`;
    document.head.appendChild(link);
  }
  if (i18n.language !== info.code) await i18n.changeLanguage(info.code);
}

export function currentLocale(): string {
  return languageInfo(i18n.language).locale;
}

void i18n
  .use(lazyBackend)
  .use(initReactI18next)
  .init({
    lng: storedLanguage(),
    fallbackLng: DEFAULT_LANGUAGE,
    supportedLngs: ["en", "ml", "hi", "ta", "ar"],
    ns: SHELL_NAMESPACES,
    defaultNS: "common",
    fallbackNS: "common",
    keySeparator: false,
    nsSeparator: false,
    returnEmptyString: false,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });

if (typeof document !== "undefined") {
  const info = languageInfo(storedLanguage());
  document.documentElement.lang = info.code;
  document.documentElement.dir = info.dir;
}

export default i18n;
