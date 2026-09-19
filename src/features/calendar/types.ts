export type CalendarEventCategory = "holiday" | "exam" | "academic" | "event" | "homework" | "leave" | "birthday";

export interface AggregatedCalendarEvent {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  category: CalendarEventCategory;
  description?: string;
}
