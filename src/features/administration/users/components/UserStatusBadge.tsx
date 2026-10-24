import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/ui/status-badge";
import type { UserStatus } from "../types";

// Colours come from the shared status map, so statuses look the same in every module.
const LABEL: Record<UserStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  locked: "Locked",
};

export default function UserStatusBadge({ status }: { status: UserStatus }) {
  const { t } = useTranslation("administration");
  return <StatusBadge status={status} label={t(LABEL[status])} />;
}
