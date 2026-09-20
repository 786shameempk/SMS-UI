import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/utils/cn";
import { CATEGORY_CONFIG, CATEGORY_ORDER } from "../constants";
import { listAggregatedCalendarEvents } from "../api";
import type { AggregatedCalendarEvent, CalendarEventCategory } from "../types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const leadingBlanks = firstDay.getDay();
  const cells: (Date | null)[] = Array.from({ length: leadingBlanks }, () => null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Multi-day events (holidays with endDate, staff leave spans) count as "on" every day in range. */
function eventCoversDay(event: AggregatedCalendarEvent, day: Date): boolean {
  const start = new Date(event.date);
  if (sameDay(start, day)) return true;
  if (!event.endDate) return false;
  const end = new Date(event.endDate);
  const dayTime = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime();
  return dayTime >= new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime() && dayTime <= new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
}

function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CalendarPage() {
  const today = useMemo(() => new Date(), []);
  const [cursor, setCursor] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState<Date>(today);
  const [activeCategories, setActiveCategories] = useState<Set<CalendarEventCategory>>(new Set(CATEGORY_ORDER));

  const { data: events = [], isLoading } = useQuery({ queryKey: ["calendar", "events"], queryFn: listAggregatedCalendarEvents });

  const visibleEvents = useMemo(() => events.filter((e) => activeCategories.has(e.category)), [events, activeCategories]);
  const cells = useMemo(() => buildMonthGrid(cursor.getFullYear(), cursor.getMonth()), [cursor]);
  const monthLabel = cursor.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, AggregatedCalendarEvent[]>();
    for (const day of cells) {
      if (!day) continue;
      const matches = visibleEvents.filter((e) => eventCoversDay(e, day));
      if (matches.length) map.set(dateKey(day), matches);
    }
    return map;
  }, [cells, visibleEvents]);

  const selectedEvents = eventsByDay.get(dateKey(selected)) ?? [];

  const toggleCategory = (category: CalendarEventCategory) => {
    setActiveCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className="p-6 space-y-5 max-w-[1200px]">
      <div>
        <h1 className="text-xl font-bold text-foreground">Calendar</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Holidays, exams, the academic calendar, homework due dates, staff leave, and birthdays — all in one place.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-5">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>{monthLabel}</CardTitle>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() - 1, 1))}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-muted-foreground cursor-pointer"
                aria-label="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + 1, 1))}
                className="w-7 h-7 rounded-md flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-muted-foreground cursor-pointer"
                aria-label="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading && <p className="text-sm text-muted-foreground py-6 text-center">Loading calendar…</p>}
            {!isLoading && (
              <div className="grid grid-cols-7 gap-1">
                {WEEKDAYS.map((wd) => (
                  <span key={wd} className="text-xs font-semibold text-muted-foreground text-center pb-1.5">
                    {wd}
                  </span>
                ))}
                {cells.map((day, i) => {
                  if (!day) return <div key={i} />;
                  const isToday = sameDay(day, today);
                  const isSelected = sameDay(day, selected);
                  const dayEvents = eventsByDay.get(dateKey(day)) ?? [];
                  const categoriesToday = Array.from(new Set(dayEvents.map((e) => e.category)));
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setSelected(day)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-lg py-2 cursor-pointer transition-colors",
                        isSelected ? "bg-brand-500 text-white" : "hover:bg-secondary",
                      )}
                    >
                      <span className={cn("text-sm", isToday && !isSelected && "font-bold text-brand-600")}>{day.getDate()}</span>
                      <div className="flex gap-0.5 h-1.5">
                        {categoriesToday.slice(0, 4).map((c) => (
                          <span key={c} className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-card" : CATEGORY_CONFIG[c].dotClass)} />
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Show</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {CATEGORY_ORDER.map((category) => {
                const config = CATEGORY_CONFIG[category];
                return (
                  <label key={category} className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox checked={activeCategories.has(category)} onCheckedChange={() => toggleCategory(category)} />
                    <span className={cn("w-2 h-2 rounded-full", config.dotClass)} />
                    <span className="text-sm text-foreground">{config.label}</span>
                  </label>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{selected.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 max-h-96 overflow-y-auto">
              {selectedEvents.length === 0 && <p className="text-sm text-muted-foreground">No events on this day.</p>}
              {selectedEvents.map((e) => {
                const config = CATEGORY_CONFIG[e.category];
                return (
                  <div key={e.id} className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant={config.badgeVariant}>{config.label}</Badge>
                    </div>
                    <p className="text-sm font-medium text-foreground">{e.title}</p>
                    {e.description && <p className="text-xs text-muted-foreground">{e.description}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
