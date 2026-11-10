import i18n from "i18next";

/**
 * Translate outside React (the renderer also runs inside the print window and for static markup). Keys are the English text, as
 * everywhere else in the app. Screens call useTranslation("progress-cards") so the language file is loaded.
 */
export const NS = "progress-cards";

export function t(key: string, options?: Record<string, unknown>): string {
  return i18n.t(key, { ns: NS, defaultValue: key, ...options }) as string;
}
