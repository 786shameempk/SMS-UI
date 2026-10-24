import { Check, Languages } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import {
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuthStore } from "@/store/authStore";
import { useUiStore } from "@/store/useUiStore";
import { LANGUAGES, languageInfo } from "./languages";
import { useChangeLanguage, type AccountPreferences } from "./preferences";

/** "Language" submenu for the user menu: the five interface languages, plus "school default". */
export function LanguageMenu() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const userId = useAuthStore((s) => s.user?.id);
  const chosen = useUiStore((s) => s.language);
  const resolved = useUiStore((s) => s.resolvedLanguage);
  const change = useChangeLanguage();
  const school = queryClient.getQueryData<AccountPreferences>(["account", "preferences", userId])?.schoolLanguage;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Languages />
        {t("Language")}
        <span className="ms-auto text-xs text-muted-foreground">{languageInfo(resolved).nativeName}</span>
      </DropdownMenuSubTrigger>
      <DropdownMenuPortal>
        <DropdownMenuSubContent>
          {LANGUAGES.map((l) => (
            <DropdownMenuItem key={l.code} onSelect={() => void change(l.code, school)} lang={l.code}>
              <span className="w-4">{chosen === l.code && <Check />}</span>
              <span>{l.nativeName}</span>
              <span className="ms-auto text-xs text-muted-foreground">{l.englishName}</span>
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem onSelect={() => void change(null, school)}>
            <span className="w-4">{chosen === null && <Check />}</span>
            {t("School default")}
            {school && <span className="ms-auto text-xs text-muted-foreground">{languageInfo(school).nativeName}</span>}
          </DropdownMenuItem>
        </DropdownMenuSubContent>
      </DropdownMenuPortal>
    </DropdownMenuSub>
  );
}
