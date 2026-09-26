export type CalendarEventCategory = "holiday" | "exam" | "academic" | "event" | "homework" | "leave" | "birthday" | "online";

export interface AggregatedCalendarEvent {
  id: string;
  date: string;
  endDate?: string;
  title: string;
  category: CalendarEventCategory;
  description?: string;
}
