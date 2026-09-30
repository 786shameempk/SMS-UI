import { CalendarClock, MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import type { ClassSession } from "../types";

export default function TodayClassesCard({ classes }: { classes: ClassSession[] }) {
  return (
    <Card className="flex h-full flex-col">
      <CardHeader>
        <CardTitle>Today&apos;s classes</CardTitle>
        <CardDescription>{classes.length} session{classes.length !== 1 ? "s" : ""} scheduled today.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-2">
        {classes.length === 0 && <EmptyState bare size="sm" icon={CalendarClock} title="No classes today" description="Your timetable for today is clear." className="h-full py-6" />}
        {classes.map((session) => (
          <div key={session.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="w-11 text-center shrink-0">
              <p className="text-xs font-semibold text-primary-text tabular-nums">{session.startTime}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{session.endTime}</p>
            </div>
            <div className="w-px h-8 bg-secondary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-5 text-foreground">{session.subject}</p>
              <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                {session.className}
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="h-3 w-3" aria-hidden="true" />
                  {session.room}
                </span>
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
