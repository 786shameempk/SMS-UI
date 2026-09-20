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

export default function StatCards({ stats }: { stats: StatCardData[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const Icon = ICONS[stat.icon] ?? Users;
        return (
          <motion.div
            key={stat.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05, ease: "easeOut" }}
          >
            <Card className="transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
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
                <div className="w-10 h-10 rounded-lg bg-brand-50 dark:bg-brand-900/40 flex items-center justify-center shrink-0">
                  <Icon className="w-[18px] h-[18px] text-brand-600 dark:text-brand-300" />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
