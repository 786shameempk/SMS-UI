import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AttendanceSummary } from "../types";

const SEGMENTS: { key: keyof Omit<AttendanceSummary, "totalMarked">; label: string; color: string }[] = [
  { key: "present", label: "Present", color: "bg-green-500" },
  { key: "late", label: "Late", color: "bg-amber-500" },
  { key: "absent", label: "Absent", color: "bg-red-500" },
  { key: "onLeave", label: "On leave", color: "bg-slate-300" },
];

export default function AttendanceSummaryCard({ attendance }: { attendance: AttendanceSummary }) {
  const total = attendance.totalMarked || 1;
  const presentPct = Math.round((attendance.present / total) * 100);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Attendance summary</CardTitle>
        <CardDescription>{presentPct}% present today, out of {attendance.totalMarked} marked.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-secondary">
          {SEGMENTS.map((seg) => {
            const value = attendance[seg.key];
            const pct = total ? (value / total) * 100 : 0;
            if (pct <= 0) return null;
            return <div key={seg.key} className={seg.color} style={{ width: `${pct}%` }} title={`${seg.label}: ${value}`} />;
          })}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
          {SEGMENTS.map((seg) => (
            <div key={seg.key} className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full shrink-0 ${seg.color}`} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground tabular-nums">{attendance[seg.key]}</p>
                <p className="text-[11px] text-muted-foreground">{seg.label}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
