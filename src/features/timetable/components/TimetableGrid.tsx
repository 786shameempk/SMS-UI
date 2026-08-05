import type { ReactNode } from "react";
import { CalendarOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/utils/cn";
import { DAY_DEFINITIONS, PERIOD_DEFINITIONS } from "../constants";
import type { DayOfWeek, TimetableSlot } from "../types";

interface TimetableGridProps {
  slots: TimetableSlot[];
  renderCell: (slot: TimetableSlot | undefined, dayOfWeek: DayOfWeek, periodNumber: number) => ReactNode;
  onCellClick?: (dayOfWeek: DayOfWeek, periodNumber: number, slot: TimetableSlot | undefined) => void;
  holidayDays?: Set<DayOfWeek>;
}

export default function TimetableGrid({ slots, renderCell, onCellClick, holidayDays }: TimetableGridProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-secondary/60">
            <th className="w-32 border-b border-r border-border px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Period
            </th>
            {DAY_DEFINITIONS.map((day) => {
              const isHoliday = holidayDays?.has(day.value);
              return (
                <th key={day.value} className="min-w-[150px] border-b border-border px-3 py-2 text-left">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.label}</span>
                    {isHoliday && (
                      <Badge variant="warning" className="gap-1">
                        <CalendarOff className="h-3 w-3" />
                        Holiday
                      </Badge>
                    )}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {PERIOD_DEFINITIONS.map((period) => (
            <tr key={period.periodNumber} className="border-b border-border last:border-0">
              <td className="border-r border-border px-3 py-2 align-top">
                <p className="text-sm font-medium text-slate-800">{period.label}</p>
                <p className="text-xs text-muted-foreground">{period.time}</p>
              </td>
              {DAY_DEFINITIONS.map((day) => {
                if (period.isBreak) {
                  return (
                    <td key={day.value} className="bg-secondary/30 px-3 py-2 text-center text-xs text-muted-foreground">
                      Lunch Break
                    </td>
                  );
                }
                const isHoliday = holidayDays?.has(day.value);
                const slot = slots.find((s) => s.dayOfWeek === day.value && s.periodNumber === period.periodNumber);
                const clickable = Boolean(onCellClick) && !isHoliday;
                return (
                  <td
                    key={day.value}
                    onClick={clickable ? () => onCellClick?.(day.value, period.periodNumber, slot) : undefined}
                    className={cn(
                      "px-2 py-2 align-top transition-colors",
                      clickable && "cursor-pointer hover:bg-secondary/50",
                      isHoliday && "bg-muted/60",
                    )}
                  >
                    {renderCell(slot, day.value, period.periodNumber)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
