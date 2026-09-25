import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type { DatesSetArg, EventClickArg, EventContentArg } from "@fullcalendar/core";
import { ArrowLeft, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils/cn";
import { listCalendarEvents } from "../api";
import { MEETING_TYPES, TYPE_LEGEND } from "../constants";
import { meetingKeys, useMeetingRole } from "../hooks";
import type { MeetingType } from "../types";
import ScheduleMeetingDialog from "../components/ScheduleMeetingDialog";
import "./calendar.css";

/**
 * Month / week / day / agenda (design decision D6: FullCalendar's MIT core, themed with the SMS tokens in
 * calendar.css). Colour = meeting type; cancelled sessions are struck through; clicking opens the meeting.
 */
export default function MeetingCalendarPage() {
  const navigate = useNavigate();
  const { canSchedule } = useMeetingRole();
  const [range, setRange] = useState<{ from: string; to: string } | null>(null);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const isNarrow = typeof window !== "undefined" && window.innerWidth < 640;

  const { data: events = [], isFetching } = useQuery({
    queryKey: meetingKeys.calendar(range?.from ?? "", range?.to ?? ""),
    queryFn: () => listCalendarEvents(range!.from, range!.to),
    enabled: !!range,
    placeholderData: (prev) => prev,
  });

  const hiddenTypes = useMemo(() => new Set(TYPE_LEGEND.filter((g) => hidden.has(g.label)).flatMap((g) => g.types)), [hidden]);
  const calendarEvents = useMemo(
    () =>
      events
        .filter((e) => !hiddenTypes.has(e.meetingType))
        .map((e) => ({
          id: e.id,
          title: e.classLabel ? `${e.title} · ${e.classLabel}` : e.title,
          start: e.startUtc,
          end: e.endUtc,
          backgroundColor: MEETING_TYPES[e.meetingType].hex,
          borderColor: MEETING_TYPES[e.meetingType].hex,
          classNames: [e.status === "Cancelled" ? "sms-cal-cancelled" : "", e.status === "Live" ? "sms-cal-live" : "", e.status === "Draft" ? "sms-cal-draft" : ""].filter(Boolean),
          extendedProps: { type: e.meetingType as MeetingType, status: e.status, host: e.hostName },
        })),
    [events, hiddenTypes],
  );

  const renderEvent = (arg: EventContentArg) => {
    const status = arg.event.extendedProps.status as string;
    return (
      <div className="flex min-w-0 items-center gap-1 overflow-hidden px-1 text-[11px] leading-tight">
        {/* Month and agenda views draw events as text rows, so the type colour becomes a dot there. */}
        {!arg.view.type.startsWith("timeGrid") && (
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: arg.event.backgroundColor }} aria-hidden />
        )}
        {status === "Live" && <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-green-500" aria-label="Live" />}
        {arg.timeText && <span className="shrink-0 font-semibold">{arg.timeText}</span>}
        <span className="truncate">{arg.event.title}</span>
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Link to="/online-classes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Online Classes
          </Link>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Class calendar</h1>
        </div>
        {canSchedule && <Button onClick={() => setScheduleOpen(true)}><Plus className="h-4 w-4" /> Schedule</Button>}
      </div>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show meeting types">
        {TYPE_LEGEND.map((g) => {
          const on = !hidden.has(g.label);
          return (
            <button
              key={g.label}
              type="button"
              aria-pressed={on}
              onClick={() => setHidden((prev) => { const next = new Set(prev); if (on) next.add(g.label); else next.delete(g.label); return next; })}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity cursor-pointer",
                on ? "border-border bg-card text-foreground" : "border-dashed border-border text-muted-foreground opacity-60",
              )}
            >
              <span className={cn("h-2.5 w-2.5 rounded-full", g.dot)} aria-hidden />
              {g.label}
            </button>
          );
        })}
        {isFetching && <span className="text-xs text-muted-foreground">Updating…</span>}
      </div>

      <div className="sms-calendar rounded-2xl border border-border bg-card p-2 sm:p-4">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView={isNarrow ? "listWeek" : "timeGridWeek"}
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: isNarrow ? "listWeek,timeGridDay,dayGridMonth" : "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          buttonText={{ today: "Today", month: "Month", week: "Week", day: "Day", list: "Agenda" }}
          height="auto"
          firstDay={1}
          nowIndicator
          slotMinTime="06:00:00"
          slotMaxTime="23:00:00"
          allDaySlot={false}
          dayMaxEvents={3}
          events={calendarEvents}
          eventContent={renderEvent}
          eventClick={(arg: EventClickArg) => {
            arg.jsEvent.preventDefault();
            navigate(`/online-classes/${arg.event.id}`);
          }}
          datesSet={(arg: DatesSetArg) => setRange({ from: arg.start.toISOString(), to: arg.end.toISOString() })}
          noEventsContent="Nothing scheduled in this period."
        />
      </div>

      {canSchedule && <ScheduleMeetingDialog open={scheduleOpen} onOpenChange={setScheduleOpen} />}
    </div>
  );
}
