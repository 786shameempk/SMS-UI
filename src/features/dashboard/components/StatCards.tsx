import {
  Users,
  Briefcase,
  CalendarCheck,
  Wallet,
  ClipboardList,
  FileCheck,
  Presentation,
  BookOpen,
  AlarmClock,
  Receipt,
  IdCard,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { StatCard, StatGrid, type StatTone } from "@/components/ui/stat-card";
import { Skeleton } from "@/components/ui/skeleton";
import type { StatCardData } from "../types";

const ICONS: Record<string, LucideIcon> = {
  Users,
  Briefcase,
  CalendarCheck,
  Wallet,
  ClipboardList,
  FileCheck,
  Presentation,
  BookOpen,
  AlarmClock,
  Receipt,
  IdCard,
  LifeBuoy,
};

/** A small, fixed set of soft tones so each KPI is recognisable without the row turning into a rainbow. */
const TONES: StatTone[] = ["brand", "info", "success", "warning"];

export default function StatCards({ stats }: { stats: StatCardData[] }) {
  return (
    // Four across when the widget itself is wide enough (container query), not the window: with the sidebar open on
    // a laptop the window is "xl" but the content isn't, and a user can resize this widget to half width.
    <div className="@container">
      <StatGrid columns={2} className="@2xl:grid-cols-4">
      {stats.map((stat, index) => (
        <StatCard
          key={stat.id}
          label={stat.label}
          value={stat.value}
          icon={ICONS[stat.icon] ?? Users}
          tone={TONES[index % TONES.length]}
          trend={stat.delta ? { value: stat.delta.value, direction: stat.delta.direction } : undefined}
        />
      ))}
      </StatGrid>
    </div>
  );
}

/** Four placeholder tiles while the key figures load. */
export function StatsSkeleton() {
  return (
    <div className="@container" aria-busy="true" aria-label="Loading key figures">
      <div className="grid grid-cols-2 gap-3 sm:gap-4 @2xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-[112px] rounded-xl" />
        ))}
      </div>
    </div>
  );
}
