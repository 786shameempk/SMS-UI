import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/utils/cn";
import { getStaffAttendance } from "../../api";

const STATUS_STYLE: Record<string, string> = {
  present: "bg-success",
  absent: "bg-destructive",
  late: "bg-warning",
  holiday: "bg-border",
};

const STATUS_LABEL: Record<string, string> = {
  present: "Present",
  absent: "Absent",
  late: "Late",
  holiday: "Holiday / weekend",
};

export default function StaffAttendanceTab({ staffId }: { staffId: string }) {
  const { t } = useTranslation("staff");
  const { data, isLoading } = useQuery({
    queryKey: ["staff", "attendance", staffId],
    queryFn: () => getStaffAttendance(staffId),
  });

  if (isLoading || !data) return <p className="text-sm text-muted-foreground">{t("Loading attendance…")}</p>;

  const pct = data.totalDays > 0 ? Math.round((data.presentDays / data.totalDays) * 100) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("Attendance")}</CardTitle>
        <CardDescription>
          {data.totalDays > 0
            ? data.totalDays === 1
              ? t("{{pct}}% present across {{days}} marked day in the last 90 days.", { pct, days: data.totalDays })
              : t("{{pct}}% present across {{days}} marked days in the last 90 days.", { pct, days: data.totalDays })
            : t("No attendance has been marked for this staff member in the last 90 days.")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-lg bg-secondary/60 p-3 text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{data.presentDays}</p>
            <p className="text-[11px] text-muted-foreground">{t("Present")}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3 text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{data.lateDays}</p>
            <p className="text-[11px] text-muted-foreground">{t("Late")}</p>
          </div>
          <div className="rounded-lg bg-secondary/60 p-3 text-center">
            <p className="text-lg font-bold text-foreground tabular-nums">{data.absentDays}</p>
            <p className="text-[11px] text-muted-foreground">{t("Absent")}</p>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground mb-2">{t("Last 14 days")}</p>
          <div className="flex gap-1.5 flex-wrap">
            {data.recent.map((day) => (
              <div
                key={day.date}
                title={`${new Date(day.date).toLocaleDateString()} — ${t(STATUS_LABEL[day.status] ?? "")}`}
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
