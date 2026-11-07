import { useTranslation } from "react-i18next";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type LoginFilter = "all" | "linked" | "not-linked";

/** Keeps the people whose sign-in link matches the filter; "all" keeps everyone. */
export function matchesLoginFilter(linked: boolean, filter: LoginFilter): boolean {
  return filter === "all" || (filter === "linked" ? linked : !linked);
}

/** Lets an administrator find the people who cannot sign in yet. */
export default function LoginAccountFilter({ value, onChange }: { value: LoginFilter; onChange: (value: LoginFilter) => void }) {
  const { t } = useTranslation("common");
  return (
    <Select value={value} onValueChange={(v) => onChange(v as LoginFilter)}>
      <SelectTrigger className="sm:w-44" aria-label={t("Filter by login account")}>
        <SelectValue placeholder={t("Login account")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">{t("All login accounts")}</SelectItem>
        <SelectItem value="linked">{t("Account linked")}</SelectItem>
        <SelectItem value="not-linked">{t("Not linked")}</SelectItem>
      </SelectContent>
    </Select>
  );
}

export function loginFilterLabel(value: LoginFilter, t: (key: string) => string): string {
  return value === "linked" ? t("Account linked") : value === "not-linked" ? t("Not linked") : t("All login accounts");
}
