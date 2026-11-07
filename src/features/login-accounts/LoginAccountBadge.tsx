import { Link2, Link2Off } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

/**
 * Whether a person has a sign-in account linked. Based on the real link between the profile and the account, never on whether an
 * email or a mobile number happens to be on file. `detail` says whose account (for a student: the student's and / or a parent's).
 */
export default function LoginAccountBadge({ linked, detail }: { linked: boolean; detail?: string }) {
  const { t } = useTranslation("common");
  const label = linked ? t("Account linked") : t("Not linked");
  return (
    <Badge variant={linked ? "success" : "warning"} title={detail ? `${label} · ${detail}` : label}>
      {linked ? <Link2 className="h-3 w-3" aria-hidden="true" /> : <Link2Off className="h-3 w-3" aria-hidden="true" />}
      {label}
    </Badge>
  );
}
