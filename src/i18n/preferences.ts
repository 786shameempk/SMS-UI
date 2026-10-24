import { useCallback, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { authHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/useUiStore";
import { DEFAULT_LANGUAGE, normalizeLanguage } from "./languages";

export interface AccountPreferences {
  /** The user's own choice, or null to follow the school. */
  language: string | null;
  /** The school's default interface language (Settings → Localization). */
  schoolLanguage: string;
}

export async function getAccountPreferences(): Promise<AccountPreferences> {
  try {
    return (await authHttpClient.get<AccountPreferences>("/api/account/preferences")).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

export async function setAccountLanguage(language: string | null): Promise<AccountPreferences> {
  try {
    return (await authHttpClient.put<AccountPreferences>("/api/account/preferences/language", { language })).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

/**
 * Keeps the interface language in line with the signed-in account: their own choice, else the school default.
 * Signed out (login page), the browser's last language stays.
 */
export function useLanguageSync() {
  const userId = useAuthStore((s) => s.user?.id);
  const setLanguage = useUiStore((s) => s.setLanguage);
  const prefs = useQuery({ queryKey: ["account", "preferences", userId], queryFn: getAccountPreferences, enabled: !!userId, staleTime: 5 * 60_000, retry: false });
  useEffect(() => {
    if (!prefs.data) return;
    const chosen = normalizeLanguage(prefs.data.language);
    setLanguage(chosen, chosen ?? normalizeLanguage(prefs.data.schoolLanguage) ?? DEFAULT_LANGUAGE);
  }, [prefs.data, setLanguage]);
}

/** Change the language now, and save it on the account (null = back to the school's default). */
export function useChangeLanguage() {
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const setLanguage = useUiStore((s) => s.setLanguage);
  return useCallback(
    async (code: string | null, schoolLanguage?: string) => {
      const resolved = code ?? normalizeLanguage(schoolLanguage) ?? DEFAULT_LANGUAGE;
      setLanguage(code, resolved);
      if (!userId) return;
      try {
        const saved = await setAccountLanguage(code);
        queryClient.setQueryData(["account", "preferences", userId], saved);
      } catch {
        // Offline or not allowed: the choice still applies in this browser.
      }
    },
    [queryClient, setLanguage, userId],
  );
}
