import type { ReactNode } from "react";
import { CalendarOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
    <Table containerClassName="rounded-xl border border-border bg-card" className="border-collapse">
      <TableHeader>
        <TableRow hover={false}>
          <TableHead className="w-32 border-r border-border px-3">Period</TableHead>
          {DAY_DEFINITIONS.map((day) => {
            const isHoliday = holidayDays?.has(day.value);
            return (
              <TableHead key={day.value} className="min-w-[150px] px-3">
                <div className="flex items-center gap-1.5">
                  <span>{day.label}</span>
                  {isHoliday && (
                    <Badge variant="warning" className="gap-1">
                      <CalendarOff className="h-3 w-3" />
                      Holiday
                    </Badge>
                  )}
                </div>
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>
      <TableBody>
        {PERIOD_DEFINITIONS.map((period) => (
          <TableRow key={period.periodNumber} hover={false} className="border-border">
            <TableCell className="border-r border-border px-3 py-2 align-top">
              <p className="text-sm font-medium text-foreground">{period.label}</p>
              <p className="text-xs text-muted-foreground">{period.time}</p>
            </TableCell>
            {DAY_DEFINITIONS.map((day) => {
              if (period.isBreak) {
                return (
                  <TableCell key={day.value} className="bg-secondary/30 px-3 py-2 text-center text-xs text-muted-foreground">
                    Lunch Break
                  </TableCell>
                );
              }
              const isHoliday = holidayDays?.has(day.value);
              const slot = slots.find((s) => s.dayOfWeek === day.value && s.periodNumber === period.periodNumber);
              const clickable = Boolean(onCellClick) && !isHoliday;
              return (
                <TableCell
                  key={day.value}
                  onClick={clickable ? () => onCellClick?.(day.value, period.periodNumber, slot) : undefined}
                  className={cn(
                    "px-2 py-2 align-top transition-colors",
                    clickable && "cursor-pointer hover:bg-secondary/50",
                    isHoliday && "bg-muted/60",
                  )}
                >
                  {renderCell(slot, day.value, period.periodNumber)}
                </TableCell>
              );
            })}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
