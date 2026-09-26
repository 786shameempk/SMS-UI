import { StatusBadge } from "@/components/ui/status-badge";
import type { StudentStatus } from "../types";

const STATUS_CONFIG: Record<StudentStatus, { label: string; variant: "success" | "neutral" | "danger" | "info" | "warning" }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
  transferred: { label: "Transferred", variant: "warning" },
  graduated: { label: "Graduated", variant: "info" },
  alumni: { label: "Alumni", variant: "info" },
};

export default function StudentStatusBadge({ status }: { status: StudentStatus }) {
  const config = STATUS_CONFIG[status];
  return <StatusBadge status={status} label={config.label} variant={config.variant} />;
}
