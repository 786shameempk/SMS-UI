import { MapPin } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ClassSession } from "../types";

export default function TodayClassesCard({ classes }: { classes: ClassSession[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Today&apos;s classes</CardTitle>
        <CardDescription>{classes.length} session{classes.length !== 1 ? "s" : ""} scheduled today.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {classes.length === 0 && <p className="text-sm text-muted-foreground">No classes scheduled today.</p>}
        {classes.map((session) => (
          <div key={session.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
            <div className="w-11 text-center shrink-0">
              <p className="text-xs font-semibold text-brand-600 tabular-nums">{session.startTime}</p>
              <p className="text-[10px] text-muted-foreground tabular-nums">{session.endTime}</p>
            </div>
            <div className="w-px h-8 bg-secondary shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{session.subject}</p>
              <p className="text-xs text-muted-foreground truncate">{session.className}</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
              <MapPin className="w-3 h-3" />
              {session.room}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
