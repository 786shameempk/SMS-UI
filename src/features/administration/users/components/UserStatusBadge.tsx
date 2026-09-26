import { StatusBadge } from "@/components/ui/status-badge";
import type { UserStatus } from "../types";

const STATUS_CONFIG: Record<UserStatus, { label: string; variant: "success" | "neutral" | "danger" }> = {
  active: { label: "Active", variant: "success" },
  inactive: { label: "Inactive", variant: "neutral" },
  locked: { label: "Locked", variant: "danger" },
};

export default function UserStatusBadge({ status }: { status: UserStatus }) {
  const config = STATUS_CONFIG[status];
  return <StatusBadge status={status} label={config.label} variant={config.variant} />;
}
