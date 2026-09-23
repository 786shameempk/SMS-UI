import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { getStaffAttendance } from "../../api";

const STATUS_STYLE: Record<string, string> = {
  present: "bg-green-500",
  absent: "bg-red-500",
  late: "bg-amber-500",
  holiday: "bg-slate-200",
};

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  holiday: "Holiday / weekend",
};

export default function StaffAttendanceTab({ staffId }: { staffId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["staff", "attendance", staffId],
    queryFn: () => getStaffAttendance(staffId),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">Loading attendance…</p>;

  const pct = data.totalDays > 0 ? Math.round((data.presentDays / data.totalDays) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance</CardTitle>
        <CardDescription>
          {data.totalDays > 0
            ? `${pct}% present across ${data.totalDays} marked day${data.totalDays === 1 ? "" : "s"} in the last 90 days.`
            : "No attendance has been marked for this staff member in the last 90 days."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary/60 p-3 text-center">
            <p className="text-lg font-bold text-slate-800 tabular-nums">{data.presentDays}</p>
            <p className="text-[11px] text-slate-500">Present</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3 text-center">
            <p className="text-lg font-bold text-slate-800 tabular-nums">{data.lateDays}</p>
            <p className="text-[11px] text-slate-500">Late</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3 text-center">
            <p className="text-lg font-bold text-slate-800 tabular-nums">{data.absentDays}</p>
            <p className="text-[11px] text-slate-500">Absent</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2">Last 14 days</p>
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
        </div>
      </CardContent>
    </Card>
  );
}
