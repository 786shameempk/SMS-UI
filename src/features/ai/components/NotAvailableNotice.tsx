import { Info } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Shown where a role may use an AI feature but the configured AI provider cannot run it. */
export default function NotAvailableNotice({ what }: { what: string }) {
  const { t } = useTranslation("ai");
  return (
    <div role="status" className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2.5 text-sm text-muted-foreground">
      <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      {t("{{what}} isn't available with this school's current AI setup. An administrator can enable it by configuring an AI provider.", { what: t(what) })}
    </div>
  );
}
