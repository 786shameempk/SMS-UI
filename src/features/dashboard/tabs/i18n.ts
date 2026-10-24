import i18n from "@/i18n";

/** The shape of `t` that plain helpers accept, so a component can pass its own `t` from useTranslation("dashboard"). */
export type Translate = (key: string, options?: Record<string, unknown>) => string;

/**
 * Translates in the "dashboard" namespace outside a component: helpers called while rendering and the live data
 * loaders. Keys are the English text, so English (and any untranslated key) comes back unchanged.
 */
export const dashboardT: Translate = (key, options) => i18n.t(key, { ...options, ns: "dashboard" }) as string;
