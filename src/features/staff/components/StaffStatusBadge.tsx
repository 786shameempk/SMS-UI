import { StatusBadge } from "@/components/ui/status-badge";
import type { StaffStatus } from "../types";

// Colours come from the shared status map, so statuses look the same in every module.
const LABEL: Record<StaffStatus, string> = {
  active: "Active",
  "on-leave": "On leave",
  resigned: "Resigned",
  terminated: "Terminated",
};

export default function StaffStatusBadge({ status }: { status: StaffStatus }) {
  return <StatusBadge status={status} label={LABEL[status]} />;
}
