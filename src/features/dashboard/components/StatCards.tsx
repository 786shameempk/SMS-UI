import {
  Users,
  Briefcase,
  CalendarCheck,
  Wallet,
  ClipboardList,
  FileCheck,
  Presentation,
  type LucideIcon,
} from "lucide-react";
import { StatCard, StatGrid, type StatTone } from "@/components/ui/stat-card";
import type { StatCardData } from "../types";

const ICONS: Record<string, LucideIcon> = {
  Users,
  Briefcase,
  CalendarCheck,
  Wallet,
  ClipboardList,
  FileCheck,
  Presentation,
};

/** A small, fixed set of soft tones so each KPI is recognisable without the row turning into a rainbow. */
const TONES: StatTone[] = ["brand", "info", "success", "warning"];

export default function StatCards({ stats }: { stats: StatCardData[] }) {
  return (
    <StatGrid columns={4}>
      {stats.map((stat, index) => (
        <StatCard
          key={stat.id}
          label={stat.label}
          value={stat.value}
          icon={ICONS[stat.icon] ?? Users}
          tone={TONES[index % TONES.length]}
          trend={stat.delta ? { value: stat.delta.value, direction: stat.delta.direction } : undefined}
          className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300 fill-mode-both"
          style={{ animationDelay: `${index * 40}ms` }}
        />
      ))}
    </StatGrid>
  );
}
