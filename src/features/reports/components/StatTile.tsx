import type { LucideIcon } from "lucide-react";
import { StatCard } from "@/components/ui/stat-card";

/** Reports' KPI tile — now a thin alias of the shared StatCard so every module's KPIs look the same. */
export default function StatTile({ label, value, icon }: { label: string; value: string; icon: LucideIcon }) {
  return <StatCard label={label} value={value} icon={icon} />;
}
