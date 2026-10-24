import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";
import type { CertificateStatus } from "../types";

const CONFIG: Record<CertificateStatus, { label: string; variant: "success" | "danger" | "warning" }> = {
  valid: { label: "Valid", variant: "success" },
  revoked: { label: "Revoked", variant: "danger" },
  superseded: { label: "Replaced", variant: "warning" },
};

export default function CertificateStatusBadge({ status }: { status: CertificateStatus }) {
  const { t } = useTranslation("certificates");
  return <Badge variant={CONFIG[status].variant}>{t(CONFIG[status].label)}</Badge>;
}
