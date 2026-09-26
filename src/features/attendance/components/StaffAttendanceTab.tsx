import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { listStaff } from "@/features/staff/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getStaffAttendanceForDate, saveStaffAttendance } from "../api";
import { STAFF_ATTENDANCE_STATUSES, staffAttendanceStatusBadgeVariant, todayDateKey } from "../constants";
import StatusToggleGroup from "./StatusToggleGroup";
import type { StaffMember } from "@/features/staff/types";
import type { MarkStaffAttendanceEntry, StaffAttendanceRecord, StaffAttendanceStatus } from "../types";

// Stable fallbacks — see MarkAttendanceTab: an inline `= []` default re-triggers the status-map
// effect on every render while loading (or forever if a request fails), freezing the page.
const NO_STAFF: StaffMember[] = [];
const NO_RECORDS: StaffAttendanceRecord[] = [];

function initialsOf(first: string, last: string) {
  return `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
}

export default function StaffAttendanceTab() {
  const queryClient = useQueryClient();
  const [date, setDate] = useState(todayDateKey());
  const [statusMap, setStatusMap] = useState<Record<string, StaffAttendanceStatus>>({});

  const { data: allStaff = NO_STAFF, isLoading: staffLoading } = useQuery({ queryKey: ["attendance", "staff-directory"], queryFn: listStaff });
  const staffList = useMemo(() => allStaff.filter((s) => s.status === "active" || s.status === "on-leave"), [allStaff]);

  const { data: existingRecords = NO_RECORDS } = useQuery({
    queryKey: ["attendance", "staff-records", date],
    queryFn: () => getStaffAttendanceForDate(date),
    enabled: Boolean(date),
  });

  useEffect(() => {
    if (!staffList.length) {
      setStatusMap({});
      return;
    }
    if (existingRecords.length) {
      const map: Record<string, StaffAttendanceStatus> = {};
      existingRecords.forEach((r) => {
        map[r.staffId] = r.status;
      });
      setStatusMap(map);
    } else {
      const map: Record<string, StaffAttendanceStatus> = {};
      staffList.forEach((s) => {
        map[s.id] = "present";
      });
      setStatusMap(map);
    }
  }, [staffList, existingRecords]);

  const saveMutation = useMutation({
    mutationFn: (entries: MarkStaffAttendanceEntry[]) => saveStaffAttendance({ date, entries }),
    onSuccess: () => {
      toast.success("Staff attendance saved");
      queryClient.invalidateQueries({ queryKey: ["attendance", "staff-records", date] });
    },
    onError: () => toast.error("Could not save staff attendance"),
  });

  const counts = useMemo(() => {
    const tally: Record<StaffAttendanceStatus, number> = { present: 0, absent: 0, late: 0 };
    staffList.forEach((s) => {
      const status = statusMap[s.id];
      if (status) tally[status] += 1;
    });
    return tally;
  }, [staffList, statusMap]);

  const markAllPresent = () => {
    const map: Record<string, StaffAttendanceStatus> = {};
    staffList.forEach((s) => {
      map[s.id] = "present";
    });
    setStatusMap(map);
  };

  const handleSave = () => {
    if (!staffList.length) return;
    const entries: MarkStaffAttendanceEntry[] = staffList.map((s) => ({ staffId: s.id, status: statusMap[s.id] ?? "present" }));
    saveMutation.mutate(entries);
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle>Teacher &amp; staff attendance</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {staffList.length} active staff · {new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="staff-attendance-date" className="sr-only">
              Date
            </Label>
            <Input id="staff-attendance-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} max={todayDateKey()} />
          </div>
          <Button type="button" variant="outline" onClick={markAllPresent} disabled={!staffList.length}>
            <CheckCheck className="w-4 h-4" />
            Mark all present
          </Button>
          <Button type="button" onClick={handleSave} disabled={!staffList.length || saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save attendance
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {STAFF_ATTENDANCE_STATUSES.map((s) => (
            <Badge key={s.value} variant={staffAttendanceStatusBadgeVariant(s.value)}>
              {s.label}: {counts[s.value]}
            </Badge>
          ))}
        </div>

        <div className="rounded-xl border border-border overflow-hidden">
          <div className="max-h-[520px] overflow-y-auto divide-y divide-border">
            {staffLoading && <p className="px-4 py-6 text-sm text-muted-foreground">Loading staff…</p>}
            {!staffLoading && !staffList.length && <p className="px-4 py-6 text-sm text-muted-foreground">No staff to mark attendance for.</p>}
            {!staffLoading &&
              staffList.map((member) => (
                <div key={member.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                  <div className="flex items-center gap-3 min-w-[220px]">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="text-[11px]">{initialsOf(member.firstName, member.lastName)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {member.firstName} {member.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {member.designation} · {member.employeeId}
                      </p>
                    </div>
                  </div>
                  <div className="sm:ml-auto">
                    <StatusToggleGroup
                      value={statusMap[member.id]}
                      onChange={(status) => setStatusMap((prev) => ({ ...prev, [member.id]: status }))}
                      options={STAFF_ATTENDANCE_STATUSES}
                    />
                  </div>
                </div>
              ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
