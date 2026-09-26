import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/tables/DataTable";
import { getDailySectionSummaries } from "../../api";
import { todayDateKey } from "../../constants";
import type { DailySectionSummary } from "../../types";

const columns: ColumnDef<DailySectionSummary, unknown>[] = [
  {
    id: "class",
    header: "Class / Section",
    cell: ({ row }) => (
      <span className="text-sm font-medium text-foreground">
        {row.original.className} · {row.original.sectionName}
      </span>
    ),
  },
  { accessorKey: "totalStudents", header: "Roster", cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.totalStudents}</span> },
  { accessorKey: "present", header: "Present", cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.present}</span> },
  { accessorKey: "absent", header: "Absent", cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.absent}</span> },
  { accessorKey: "late", header: "Late", cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.late}</span> },
  { accessorKey: "halfDay", header: "Half Day", cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.halfDay}</span> },
  { accessorKey: "leave", header: "Leave", cell: ({ row }) => <span className="text-sm text-secondary-foreground">{row.original.leave}</span> },
  {
    accessorKey: "percentPresent",
    header: "% Present",
    cell: ({ row }) => <span className="text-sm font-semibold text-foreground tabular-nums">{row.original.percentPresent}%</span>,
  },
];

export default function DailyAttendanceReport() {
  const [date, setDate] = useState(todayDateKey());
  const { data: summaries = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["attendance", "report-daily", date],
    queryFn: () => getDailySectionSummaries(date),
  });

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle>Daily attendance</CardTitle>
        <div className="space-y-1.5">
          <Label htmlFor="daily-report-date" className="sr-only">
            Date
          </Label>
          <Input id="daily-report-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayDateKey()} />
        </div>
      </CardHeader>
      <CardContent>
        <DataTable searchable columns={columns} data={summaries} isLoading={isLoading} isError={isError} onRetry={() => refetch()} emptyMessage="No attendance marked for this date." />
      </CardContent>
    </Card>
  );
}
