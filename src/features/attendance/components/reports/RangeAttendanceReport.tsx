import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { listClasses, listSections } from "@/features/academics/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/tables/DataTable";
import { getSectionRoster, listAttendanceRecords } from "../../api";
import { todayDateKey } from "../../constants";
import type { AttendanceRecord } from "../../types";
import PrintRegisterButton from "./PrintRegisterButton";

import { useTranslation } from "react-i18next";
const ALL = "__all__";

interface Tally {
  present: number;
  absent: number;
  late: number;
  halfDay: number;
  leave: number;
  marked: number;
  percentPresent: number;
}

interface SummaryRow extends Tally {
  id: string;
  label: string;
  sub?: string;
}

function emptyTally(): Tally {
  return { present: 0, absent: 0, late: 0, halfDay: 0, leave: 0, marked: 0, percentPresent: 0 };
}

function addRecord(t: Tally, r: AttendanceRecord) {
  t.marked++;
  if (r.status === "present") t.present++;
  else if (r.status === "absent") t.absent++;
  else if (r.status === "late") t.late++;
  else if (r.status === "half-day") t.halfDay++;
  else if (r.status === "leave") t.leave++;
}

/** Late and half-day students did attend, so they count towards attendance alongside present. */
function finish(t: Tally): Tally {
  t.percentPresent = t.marked ? Math.round(((t.present + t.late + t.halfDay) / t.marked) * 1000) / 10 : 0;
  return t;
}

const num = (key: keyof Tally, header: string): ColumnDef<SummaryRow, unknown> => ({
  id: key,
  header,
  accessorFn: (r) => r[key],
  cell: ({ row }) => <span className="text-sm text-secondary-foreground tabular-nums">{row.original[key]}</span>,
});

const columns = (firstHeader: string): ColumnDef<SummaryRow, unknown>[] => [
  {
    id: "name",
    header: firstHeader,
    accessorFn: (r) => r.label,
    cell: ({ row }) => (
      <div>
        <p className="text-sm font-medium text-foreground">{row.original.label}</p>
        {row.original.sub && <p className="text-xs text-muted-foreground">{row.original.sub}</p>}
      </div>
    ),
  },
  num("marked", "Days marked"),
  num("present", "Present"),
  num("absent", "Absent"),
  num("late", "Late"),
  num("halfDay", "Half day"),
  num("leave", "Leave"),
  {
    id: "percentPresent",
    header: "% Attended",
    accessorFn: (r) => r.percentPresent,
    cell: ({ row }) => <span className="text-sm font-semibold text-foreground tabular-nums">{row.original.percentPresent}%</span>,
  },
];

function daysAgoKey(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function RangeAttendanceReport() {
  const { t } = useTranslation("attendance");
  const [dateFrom, setDateFrom] = useState(daysAgoKey(29));
  const [dateTo, setDateTo] = useState(todayDateKey());
  const [classId, setClassId] = useState(ALL);
  const [sectionId, setSectionId] = useState(ALL);

  const { data: classes = [] } = useQuery({ queryKey: ["attendance", "classes"], queryFn: listClasses });
  const { data: sections = [] } = useQuery({ queryKey: ["attendance", "sections"], queryFn: listSections });

  const rangeValid = Boolean(dateFrom && dateTo && dateFrom <= dateTo);
  const sectionsOfClass = useMemo(() => (classId === ALL ? [] : sections.filter((s) => s.classId === classId)), [sections, classId]);
  const studentView = sectionId !== ALL;

  const { data: records = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["attendance", "report-range", dateFrom, dateTo, studentView ? sectionId : "all"],
    queryFn: () => listAttendanceRecords({ dateFrom, dateTo, sectionId: studentView ? sectionId : undefined }),
    enabled: rangeValid,
  });
  const { data: roster = [] } = useQuery({
    queryKey: ["attendance", "roster", sectionId],
    queryFn: () => getSectionRoster(sectionId),
    enabled: studentView,
  });

  const rows = useMemo<SummaryRow[]>(() => {
    if (studentView) {
      const tallies = new Map<string, Tally>();
      for (const r of records) addRecord(tallies.get(r.studentId) ?? tallies.set(r.studentId, emptyTally()).get(r.studentId)!, r);
      return roster.map((s) => ({
        id: s.id,
        label: `${s.firstName} ${s.lastName}`,
        sub: s.rollNumber ? `Roll ${s.rollNumber}` : s.admissionNumber,
        ...finish(tallies.get(s.id) ?? emptyTally()),
      }));
    }
    const classById = new Map(classes.map((c) => [c.id, c] as const));
    const tallies = new Map<string, Tally>();
    for (const r of records) addRecord(tallies.get(r.sectionId) ?? tallies.set(r.sectionId, emptyTally()).get(r.sectionId)!, r);
    return sections
      .filter((s) => (classId === ALL || s.classId === classId) && tallies.has(s.id))
      .map((s) => ({
        id: s.id,
        label: `${classById.get(s.classId)?.name ?? "Class"} · ${s.name}`,
        ...finish(tallies.get(s.id)!),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }));
  }, [records, roster, sections, classes, classId, studentView]);

  const sectionObj = sections.find((s) => s.id === sectionId);
  const classObj = classes.find((c) => c.id === classId);
  const classLabel = sectionObj ? `${classObj?.name ?? "Class"} / ${sectionObj.name}` : "";

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-end justify-between gap-3">
        <CardTitle>{t("Attendance by date range")}</CardTitle>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="range-from">{t("From")}</Label>
            <Input id="range-from" type="date" value={dateFrom} max={dateTo || todayDateKey()} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="range-to">{t("To")}</Label>
            <Input id="range-to" type="date" value={dateTo} min={dateFrom} max={todayDateKey()} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>{t("Class")}</Label>
            <Select
              value={classId}
              onValueChange={(v) => {
                setClassId(v);
                setSectionId(ALL);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("All classes")}</SelectItem>
                {[...classes]
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
                  .map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>{t("Section")}</Label>
            <Select value={sectionId} onValueChange={setSectionId} disabled={classId === ALL}>
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>{t("All sections")}</SelectItem>
                {sectionsOfClass.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <PrintRegisterButton
            sectionId={studentView ? sectionId : ""}
            classLabel={classLabel}
            dateFrom={dateFrom}
            dateTo={dateTo}
            period={`${dateFrom} – ${dateTo}`}
            disabled={!rangeValid}
          />
        </div>
      </CardHeader>
      <CardContent>
        {!rangeValid ? (
          <p className="text-sm text-muted-foreground">{t("Pick a start date that is on or before the end date.")}</p>
        ) : (
          <DataTable
            searchable
            columns={columns(studentView ? "Student" : "Class / Section")}
            data={rows}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => refetch()}
            exportFileName={`attendance-${dateFrom}-to-${dateTo}`}
            emptyMessage={t("No attendance was marked in this date range.")}
          />
        )}
      </CardContent>
    </Card>
  );
}
