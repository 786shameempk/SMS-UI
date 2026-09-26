import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { getAttendanceSummary } from "../api";
import type { AttendanceDayStatus } from "../types";

const STATUS_STYLE: Record<AttendanceDayStatus, string> = {
  present: "bg-success",
  absent: "bg-destructive",
  late: "bg-warning",
  holiday: "bg-border",
};

const STATUS_LABEL: Record<AttendanceDayStatus, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  holiday: "Holiday / weekend",
};

export default function AttendanceTab({ studentId }: { studentId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["parent-portal", "attendance", studentId],
    queryFn: () => getAttendanceSummary(studentId),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading attendance…</p>;

  const pct = data.totalDays > 0 ? Math.round((data.presentDays / data.totalDays) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
        <CardDescription>{pct}% present over the last {data.totalDays} school days.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary/60 p-3 text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{data.presentDays}</p>
            <p className="text-[11px] text-muted-foreground">Present</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3 text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{data.lateDays}</p>
            <p className="text-[11px] text-muted-foreground">Late</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3 text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{data.absentDays}</p>
            <p className="text-[11px] text-muted-foreground">Absent</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">Last 14 days</p>
          <div className="flex gap-1.5 flex-wrap">
            {data.recent.map((day) => (
              <div
                key={day.date}
                title={`${new Date(day.date).toLocaleDateString()} — ${STATUS_LABEL[day.status]}`}
                className={cn("w-7 h-7 rounded-md flex items-center justify-center text-[10px] font-semibold text-white", STATUS_STYLE[day.status])}
              >
                {new Date(day.date).getDate()}
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 mt-3">
            {(["present", "late", "absent", "holiday"] as AttendanceDayStatus[]).map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <span className={cn("w-2.5 h-2.5 rounded-sm", STATUS_STYLE[s])} />
                <span className="text-[11px] text-muted-foreground">{STATUS_LABEL[s]}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
