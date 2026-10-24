import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "react-i18next";
import { cn } from "@/utils/cn";
import { currentLocale } from "@/i18n";
import type { CalendarEvent } from "../types";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

/** Narrow weekday headers (Sunday first) in the interface language; English keeps S M T W T F S. */
function weekdayHeaders(language: string): string[] {
  if (language === "en") return WEEKDAYS;
  const fmt = new Intl.DateTimeFormat(currentLocale(), { weekday: "narrow" });
  // 2026-10-04 is a Sunday.
  return WEEKDAYS.map((_, i) => fmt.format(new Date(2026, 9, 4 + i)));
}
const EVENT_DOT: Record<CalendarEvent["kind"], string> = {
  holiday: "bg-warning",
  exam: "bg-destructive",
  event: "bg-info",
};

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const cells: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export default function MiniCalendar({ events }: { events: CalendarEvent[] }) {
  const { t, i18n } = useTranslation("dashboard");
  const weekdays = weekdayHeaders(i18n.language);
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

  const cells = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const eventDates = useMemo(() => events.map((e) => ({ date: new Date(e.date), kind: e.kind, label: e.label })), [events]);

  const monthLabel = cursor.toLocaleDateString(i18n.language === "en" ? undefined : `${currentLocale()}-u-nu-latn`, { month: "long", year: "numeric" });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm">{monthLabel}</CardTitle>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-muted-foreground cursor-pointer"
            aria-label={t("Previous month")}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
            className="w-6 h-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-muted-foreground cursor-pointer"
            aria-label={t("Next month")}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-y-1.5 text-center">
          {weekdays.map((wd, i) => (
            <span key={i} className="text-[10px] font-semibold text-muted-foreground">
              {wd}
            </span>
          ))}
          {cells.map((date, i) => {
            if (!date) return <span key={i} />;
            const isToday = sameDay(date, today);
            const dayEvents = eventDates.filter((e) => sameDay(e.date, date));
            return (
              <div key={i} className="flex flex-col items-center gap-0.5 py-0.5">
                <span
                  title={dayEvents.map((e) => e.label).join(", ")}
                  className={cn(
                    "w-6 h-6 flex items-center justify-center rounded-full text-xs",
                    isToday ? "bg-brand-500 text-white font-semibold" : "text-muted-foreground",
                  )}
                >
                  {date.getDate()}
                </span>
                <div className="flex gap-0.5 h-1">
                  {dayEvents.slice(0, 3).map((e, idx) => (
                    <span key={idx} className={cn("w-1 h-1 rounded-full", EVENT_DOT[e.kind])} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
