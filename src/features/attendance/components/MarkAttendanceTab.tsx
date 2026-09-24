import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { listAcademicYears, listClasses, listSections } from "@/features/academics/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getAttendanceForSectionDate, getSectionRoster, listRosterSections, saveAttendance } from "../api";
import { ATTENDANCE_STATUSES, attendanceStatusBadgeVariant, todayDateKey } from "../constants";
import CaptureModeSelector from "./CaptureModeSelector";
import StatusToggleGroup from "./StatusToggleGroup";
import type { AttendanceRecord, AttendanceStatus, CaptureMode, MarkAttendanceEntry, StudentRosterEntry } from "../types";

// Stable fallbacks: an inline `= []` default is a new array every render, and the status-map effect
// below depends on these — with no roster/records it would setState, re-render, get another new []
// and loop forever, freezing the page (the sidebar stopped responding after opening Attendance).
const NO_ROSTER: StudentRosterEntry[] = [];
const NO_RECORDS: AttendanceRecord[] = [];

export default function MarkAttendanceTab() {
  const queryClient = useQueryClient();

  const { data: academicYears = [] } = useQuery({ queryKey: ["attendance", "academic-years"], queryFn: listAcademicYears });
  const { data: classes = [] } = useQuery({ queryKey: ["attendance", "classes"], queryFn: listClasses });
  const { data: sections = [] } = useQuery({ queryKey: ["attendance", "sections"], queryFn: listSections });
  const { data: rosterSections = [] } = useQuery({ queryKey: ["attendance", "roster-sections"], queryFn: listRosterSections });

  const [academicYearId, setAcademicYearId] = useState("");
  const [classId, setClassId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [date, setDate] = useState(todayDateKey());
  const [captureMode, setCaptureMode] = useState<CaptureMode>("manual");
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus>>({});

  const rosterClassIds = useMemo(() => new Set(rosterSections.map((r) => r.classId)), [rosterSections]);
  const rosterSectionIds = useMemo(() => new Set(rosterSections.map((r) => r.sectionId)), [rosterSections]);

  const availableClasses = useMemo(
    () => classes.filter((c) => rosterClassIds.has(c.id) && (!academicYearId || c.academicYearId === academicYearId)),
    [classes, rosterClassIds, academicYearId],
  );
  const availableSections = useMemo(
    () => sections.filter((s) => s.classId === classId && rosterSectionIds.has(s.id)),
    [sections, classId, rosterSectionIds],
  );

  useEffect(() => {
    if (!academicYearId && academicYears.length) {
      setAcademicYearId((academicYears.find((y) => y.isCurrent) ?? academicYears[0]).id);
    }
  }, [academicYears, academicYearId]);

  useEffect(() => {
    if (availableClasses.length && !availableClasses.some((c) => c.id === classId)) {
      setClassId(availableClasses[0].id);
    }
  }, [availableClasses, classId]);

  useEffect(() => {
    if (availableSections.length) {
      if (!availableSections.some((s) => s.id === sectionId)) setSectionId(availableSections[0].id);
    } else if (sectionId) {
      setSectionId("");
    }
  }, [availableSections, sectionId]);

  const { data: roster = NO_ROSTER, isLoading: rosterLoading } = useQuery({
    queryKey: ["attendance", "roster", sectionId],
    queryFn: () => getSectionRoster(sectionId),
    enabled: Boolean(sectionId),
  });

  const { data: existingRecords = NO_RECORDS } = useQuery({
    queryKey: ["attendance", "records", sectionId, date],
    queryFn: () => getAttendanceForSectionDate(sectionId, date),
    enabled: Boolean(sectionId && date),
  });

  useEffect(() => {
    if (!roster.length) {
      setStatusMap({});
      return;
    }
    if (existingRecords.length) {
      const map: Record<string, AttendanceStatus> = {};
      existingRecords.forEach((r) => {
        map[r.studentId] = r.status;
      });
      setStatusMap(map);
    } else {
      const map: Record<string, AttendanceStatus> = {};
      roster.forEach((s) => {
        map[s.id] = "present";
      });
      setStatusMap(map);
    }
    // Re-derive whenever the roster or the persisted records for this section/date change.
  }, [roster, existingRecords]);

  const saveMutation = useMutation({
    mutationFn: (entries: MarkAttendanceEntry[]) => saveAttendance({ sectionId, date, captureMode, entries }),
    onSuccess: () => {
      toast.success("Attendance saved");
      queryClient.invalidateQueries({ queryKey: ["attendance", "records", sectionId, date] });
    },
    onError: () => toast.error("Could not save attendance"),
  });

  const selectedSection = availableSections.find((s) => s.id === sectionId);
  const selectedClass = availableClasses.find((c) => c.id === classId);

  const counts = useMemo(() => {
    const tally: Record<AttendanceStatus, number> = { present: 0, absent: 0, late: 0, "half-day": 0, leave: 0 };
    roster.forEach((s) => {
      const status = statusMap[s.id];
      if (status) tally[status] += 1;
    });
    return tally;
  }, [roster, statusMap]);

  const markAllPresent = () => {
    const map: Record<string, AttendanceStatus> = {};
    roster.forEach((s) => {
      map[s.id] = "present";
    });
    setStatusMap(map);
  };

  const handleSave = () => {
    if (!sectionId || !roster.length) return;
    const entries: MarkAttendanceEntry[] = roster.map((s) => ({ studentId: s.id, status: statusMap[s.id] ?? "present" }));
    saveMutation.mutate(entries);
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Roster &amp; capture mode</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label>Academic year</Label>
              <Select value={academicYearId} onValueChange={setAcademicYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id}>
                      {y.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Class</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {availableClasses.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!availableClasses.length && <p className="text-xs text-muted-foreground">No rosters seeded for this academic year.</p>}
            </div>
            <div className="space-y-1.5">
              <Label>Section</Label>
              <Select value={sectionId} onValueChange={setSectionId} disabled={!availableSections.length}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section" />
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
              <Label htmlFor="attendance-date">Date</Label>
              <Input id="attendance-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayDateKey()} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Capture mode</Label>
            <CaptureModeSelector value={captureMode} onChange={setCaptureMode} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>
              {selectedClass?.name ?? "Class"} · {selectedSection?.name ?? "Section"}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {roster.length} student{roster.length === 1 ? "" : "s"} · {new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={markAllPresent} disabled={!roster.length}>
              <CheckCheck className="w-4 h-4" />
              Mark all present
            </Button>
            <Button type="button" onClick={handleSave} disabled={!roster.length || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save attendance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {ATTENDANCE_STATUSES.map((s) => (
              <Badge key={s.value} variant={attendanceStatusBadgeVariant(s.value)}>
                {s.label}: {counts[s.value]}
              </Badge>
            ))}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto divide-y divide-border">
              {rosterLoading && <p className="px-4 py-6 text-sm text-muted-foreground">Loading roster…</p>}
              {!rosterLoading && !roster.length && (
                <p className="px-4 py-6 text-sm text-muted-foreground">No students found for this section.</p>
              )}
              {!rosterLoading &&
                roster.map((student) => (
                  <div key={student.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                    <div className="min-w-[180px]">
                      <p className="text-sm font-medium text-slate-800">
                        {student.firstName} {student.lastName}
                      </p>
                      <p className="text-xs text-slate-500">Roll {student.rollNumber}</p>
                    </div>
                    <div className="sm:ml-auto">
                      <StatusToggleGroup
                        value={statusMap[student.id]}
                        onChange={(status) => setStatusMap((prev) => ({ ...prev, [student.id]: status }))}
                        options={ATTENDANCE_STATUSES}
                      />
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
