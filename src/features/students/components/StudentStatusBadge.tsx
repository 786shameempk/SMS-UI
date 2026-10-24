import { useTranslation } from "react-i18next";
import { StatusBadge } from "@/components/ui/status-badge";
import type { StudentStatus } from "../types";

// Colours come from the shared status map, so "Active" / "Transferred" look the same in every module.
const LABEL: Record<StudentStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  transferred: "Transferred",
  graduated: "Graduated",
  alumni: "Alumni",
};

export default function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const { t } = useTranslation("students");
  return <StatusBadge status={status} label={t(LABEL[status])} />;
}
