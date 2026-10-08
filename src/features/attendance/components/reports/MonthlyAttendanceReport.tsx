import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listClasses, listSections } from "@/features/academics/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/utils/cn";
import { getMonthlyStudentSummary, listRosterSections } from "../../api";
import { statusToggleActiveClass } from "../../constants";

function daysInMonth(year: number, monthIndex: number): number {
  return new Date(year, monthIndex + 1, 0).getDate();
}

export default function MonthlyAttendanceReport() {
  const { data: classes = [] } = useQuery({ queryKey: ["attendance", "classes"], queryFn: listClasses });
  const { data: sections = [] } = useQuery({ queryKey: ["attendance", "sections"], queryFn: listSections });
  const { data: rosterSections = [] } = useQuery({ queryKey: ["attendance", "roster-sections"], queryFn: listRosterSections });

  const now = new Date();
  const currentMonthValue = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [monthValue, setMonthValue] = useState(currentMonthValue);
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const rosterClassIds = useMemo(() => new Set(rosterSections.map((r) => r.classId)), [rosterSections]);
  const rosterSectionIds = useMemo(() => new Set(rosterSections.map((r) => r.sectionId)), [rosterSections]);
  const availableClasses = useMemo(() => classes.filter((c) => rosterClassIds.has(c.id)), [classes, rosterClassIds]);
  const availableSections = useMemo(
    () => sections.filter((s) => s.classId === classId && rosterSectionIds.has(s.id)),
    [sections, classId, rosterSectionIds],
  );

  useEffect(() => {
    if (availableClasses.length && !availableClasses.some((c) => c.id === classId)) setClassId(availableClasses[0].id);
  }, [availableClasses, classId]);

  useEffect(() => {
    if (availableSections.length) {
      if (!availableSections.some((s) => s.id === sectionId)) setSectionId(availableSections[0].id);
    } else if (sectionId) {
      setSectionId("");
    }
  }, [availableSections, sectionId]);

  const [yearStr, monthStr] = monthValue.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["attendance", "report-monthly", sectionId, monthValue],
    queryFn: () => getMonthlyStudentSummary(sectionId, year, month - 1),
    enabled: Boolean(sectionId),
  });

  const dayCount = daysInMonth(year, month - 1);
  const days = Array.from({ length: dayCount }, (_, i) => i + 1);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle>Monthly attendance</CardTitle>
        <div className="flex items-end gap-2 flex-wrap">
          <div className="space-y-1.5">
            <Label>Class</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger className="w-36">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Section</Label>
            <Select value={sectionId} onValueChange={setSectionId} disabled={!availableSections.length}>
              <SelectTrigger className="w-28">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {availableSections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="monthly-report-month">Month</Label>
            <Input
              id="monthly-report-month"
              type="month"
              value={monthValue}
              onChange={(e) => setMonthValue(e.target.value)}
              max={currentMonthValue}
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table stickyHeader containerClassName="rounded-xl border border-border">
          <TableHeader>
            <TableRow hover={false}>
              <TableHead className="sticky left-0 bg-muted">Student</TableHead>
              {days.map((d) => (
                <TableHead key={d} className="px-1.5 text-center w-7">
                  {d}
                </TableHead>
              ))}
              <TableHead className="text-right">% Present</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!isLoading && !rows.length && (
              <TableRow hover={false}>
                <TableCell colSpan={days.length + 2} className="py-8 text-center text-muted-foreground">
                  No records for this section / month.
                </TableCell>
              </TableRow>
            )}
            {rows.map((row) => (
              <TableRow key={row.studentId}>
                <TableCell className="whitespace-nowrap sticky left-0 bg-card">
                  <p className="text-sm font-medium text-foreground">{row.name}</p>
                  <p className="text-xs text-muted-foreground">Roll {row.rollNumber}</p>
                </TableCell>
                {days.map((d) => {
                  const status = row.statusByDay[d];
                  return (
                    <TableCell key={d} className="px-1 text-center">
                      {status ? (
                        <span title={status} className={cn("inline-block w-4 h-4 rounded-sm", statusToggleActiveClass(status))} />
                      ) : (
                        <span className="inline-block w-4 h-4 rounded-sm bg-secondary" />
                      )}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-semibold tabular-nums">{row.percentPresent}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
