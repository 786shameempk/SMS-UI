import {
  Users,
  Briefcase,
  CalendarCheck,
  Wallet,
  ClipboardList,
  FileCheck,
  Presentation,
  ArrowUp,
  ArrowDown,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/utils/cn";
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

/** Rotating accent per card: icon chip colours + the thin top bar. */
const ACCENTS = [
  { chip: "bg-sky-500/12 text-sky-600 dark:text-sky-300", bar: "from-sky-400 to-indigo-500" },
  { chip: "bg-emerald-500/12 text-emerald-600 dark:text-emerald-300", bar: "from-emerald-400 to-teal-500" },
  { chip: "bg-brand-500/15 text-brand-700 dark:text-brand-300", bar: "from-brand-400 to-orange-500" },
  { chip: "bg-violet-500/12 text-violet-600 dark:text-violet-300", bar: "from-violet-400 to-fuchsia-500" },
];

export default function StatCards({ stats }: { stats: StatCardData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = ICONS[stat.icon] ?? Users;
        const accent = ACCENTS[index % ACCENTS.length];
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
          >
            <Card className="relative overflow-hidden rounded-2xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
              <div className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", accent.bar)} />
              <CardContent className="p-[var(--space-card-padding)] flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground truncate">{stat.label}</p>
                  <p className="text-2xl font-bold text-foreground mt-1.5 tabular-nums">{stat.value}</p>
                  {stat.delta && (
                    <div
                      className={cn(
                        "flex items-center gap-1 mt-1.5 text-xs font-medium",
                        stat.delta.direction === "up" && "text-green-600 dark:text-green-400",
                        stat.delta.direction === "down" && "text-red-600 dark:text-red-400",
                        stat.delta.direction === "flat" && "text-muted-foreground",
                      )}
                    >
                      {stat.delta.direction === "up" && <ArrowUp className="w-3 h-3" />}
                      {stat.delta.direction === "down" && <ArrowDown className="w-3 h-3" />}
                      <span>{stat.delta.value}</span>
                    </div>
                  )}
                </div>
                <div className={cn("w-11 h-11 rounded-xl flex items-center justify-center shrink-0", accent.chip)}>
                  <Icon className="w-5 h-5" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
