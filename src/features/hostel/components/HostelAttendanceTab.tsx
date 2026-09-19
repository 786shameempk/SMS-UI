import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Loader2, Save } from "lucide-react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusToggleGroup from "@/features/attendance/components/StatusToggleGroup";
import { todayDateKey as attendanceTodayDateKey } from "@/features/attendance/constants";
import { getHostelAttendanceForDate, listActiveResidents, listHostels, saveHostelAttendance } from "../api";
import type { HostelAttendanceStatus, MarkHostelAttendanceEntry } from "../types";

const STATUS_OPTIONS: { value: HostelAttendanceStatus; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "on-leave", label: "On leave" },
];

function badgeVariant(status: HostelAttendanceStatus): "success" | "danger" | "warning" {
  if (status === "present") return "success";
  if (status === "absent") return "danger";
  return "warning";
}

export default function HostelAttendanceTab() {
  const queryClient = useQueryClient();
  const [hostelId, setHostelId] = useState("");
  const [date, setDate] = useState(attendanceTodayDateKey());
  const [statusMap, setStatusMap] = useState<Record<string, HostelAttendanceStatus>>({});

  const { data: hostels = [] } = useQuery({ queryKey: ["hostel", "hostels"], queryFn: listHostels });
  const { data: residents = [], isLoading: residentsLoading } = useQuery({
    queryKey: ["hostel", "active-residents"],
    queryFn: listActiveResidents,
  });
  const { data: existingRecords = [] } = useQuery({
    queryKey: ["hostel", "attendance", date],
    queryFn: () => getHostelAttendanceForDate(date),
    enabled: Boolean(date),
  });

  useEffect(() => {
    if (!hostelId && hostels.length) setHostelId(hostels[0].id);
  }, [hostels, hostelId]);

  const hostelResidents = useMemo(() => residents.filter((r) => r.hostelId === hostelId), [residents, hostelId]);

  useEffect(() => {
    if (!hostelResidents.length) {
      setStatusMap({});
      return;
    }
    const existingByStudent = new Map(existingRecords.map((r) => [r.studentId, r.status] as const));
    const map: Record<string, HostelAttendanceStatus> = {};
    hostelResidents.forEach((r) => {
      map[r.studentId] = existingByStudent.get(r.studentId) ?? "present";
    });
    setStatusMap(map);
  }, [hostelResidents, existingRecords]);

  const saveMutation = useMutation({
    mutationFn: (entries: MarkHostelAttendanceEntry[]) => saveHostelAttendance(date, entries),
    onSuccess: () => {
      toast.success("Hostel attendance saved");
      queryClient.invalidateQueries({ queryKey: ["hostel", "attendance", date] });
    },
    onError: () => toast.error("Could not save attendance"),
  });

  const counts = useMemo(() => {
    const tally: Record<HostelAttendanceStatus, number> = { present: 0, absent: 0, "on-leave": 0 };
    hostelResidents.forEach((r) => {
      const status = statusMap[r.studentId];
      if (status) tally[status] += 1;
    });
    return tally;
  }, [hostelResidents, statusMap]);

  const markAllPresent = () => {
    const map: Record<string, HostelAttendanceStatus> = {};
    hostelResidents.forEach((r) => {
      map[r.studentId] = "present";
    });
    setStatusMap(map);
  };

  const handleSave = () => {
    if (!hostelResidents.length) return;
    const entries: MarkHostelAttendanceEntry[] = hostelResidents.map((r) => ({ studentId: r.studentId, status: statusMap[r.studentId] ?? "present" }));
    saveMutation.mutate(entries);
  };

  const selectedHostel = hostels.find((h) => h.id === hostelId);

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader>
          <CardTitle>Hostel &amp; date</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Hostel</Label>
              <Select value={hostelId} onValueChange={setHostelId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select hostel" />
                </SelectTrigger>
                <SelectContent>
                  {hostels.map((h) => (
                    <SelectItem key={h.id} value={h.id}>
                      {h.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hostel-attendance-date">Date</Label>
              <Input
                id="hostel-attendance-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                max={attendanceTodayDateKey()}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-3">
          <div>
            <CardTitle>{selectedHostel?.name ?? "Residents"}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {hostelResidents.length} resident{hostelResidents.length === 1 ? "" : "s"} ·{" "}
              {new Date(date).toLocaleDateString(undefined, { dateStyle: "medium" })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" onClick={markAllPresent} disabled={!hostelResidents.length}>
              <CheckCheck className="w-4 h-4" />
              Mark all present
            </Button>
            <Button type="button" onClick={handleSave} disabled={!hostelResidents.length || saveMutation.isPending}>
              {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save attendance
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((s) => (
              <Badge key={s.value} variant={badgeVariant(s.value)}>
                {s.label}: {counts[s.value]}
              </Badge>
            ))}
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="max-h-[520px] overflow-y-auto divide-y divide-border">
              {residentsLoading && <p className="px-4 py-6 text-sm text-muted-foreground">Loading residents…</p>}
              {!residentsLoading && !hostelResidents.length && (
                <p className="px-4 py-6 text-sm text-muted-foreground">No active residents in this hostel.</p>
              )}
              {!residentsLoading &&
                hostelResidents.map((resident) => (
                  <div key={resident.studentId} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3">
                    <div className="min-w-[180px]">
                      <p className="text-sm font-medium text-slate-800">
                        {resident.student.firstName} {resident.student.lastName}
                      </p>
                      <p className="text-xs text-slate-500">
                        {resident.room.roomNumber} · Bed {resident.bedNumber}
                      </p>
                    </div>
                    <div className="sm:ml-auto">
                      <StatusToggleGroup
                        value={statusMap[resident.studentId]}
                        onChange={(status) => setStatusMap((prev) => ({ ...prev, [resident.studentId]: status }))}
                        options={STATUS_OPTIONS}
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
