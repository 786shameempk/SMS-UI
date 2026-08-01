import { Badge } from "@/components/ui/badge";
import type { StaffStatus } from "../types";

const STATUS_CONFIG: Record<StaffStatus, { label: string; variant: "success" | "neutral" | "danger" | "warning" }> = {
  active: { label: "Active", variant: "success" },
  "on-leave": { label: "On leave", variant: "warning" },
  resigned: { label: "Resigned", variant: "neutral" },
  terminated: { label: "Terminated", variant: "danger" },
};

export default function StaffStatusBadge({ status }: { status: StaffStatus }) {
  const config = STATUS_CONFIG[status];
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
