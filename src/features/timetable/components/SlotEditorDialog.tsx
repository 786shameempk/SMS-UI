import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Subject } from "@/features/academics/types";
import type { StaffMember } from "@/features/staff/types";
import type { TeacherSubjectAssignment } from "@/features/teachers/types";
import { DAY_DEFINITIONS, PERIOD_DEFINITIONS } from "../constants";
import type { DayOfWeek, Room, TimetableSlot } from "../types";

const NONE = "none";

export interface SlotEditorContext {
  sectionId: string;
  dayOfWeek: DayOfWeek;
  periodNumber: number;
  slot?: TimetableSlot;
}

export default function SlotEditorDialog({
  context,
  onOpenChange,
  subjects,
  teachers,
  assignments,
  classId,
  rooms,
  submitting,
  onSave,
  onClear,
}: {
  context: SlotEditorContext | null;
  onOpenChange: (open: boolean) => void;
  subjects: Subject[];
  teachers: StaffMember[];
  assignments: TeacherSubjectAssignment[];
  classId: string;
  rooms: Room[];
  submitting: boolean;
  onSave: (values: { subjectId?: string; staffId?: string; room?: string }) => Promise<void>;
  onClear: () => Promise<void>;
}) {
  const [subjectId, setSubjectId] = useState(NONE);
  const [staffId, setStaffId] = useState(NONE);
  const [roomId, setRoomId] = useState(NONE);

  useEffect(() => {
    if (context) {
      setSubjectId(context.slot?.subjectId ?? NONE);
      setStaffId(context.slot?.staffId ?? NONE);
      setRoomId(context.slot?.room ?? NONE);
    }
  }, [context]);

  const eligibleTeacherIds = new Set(
    assignments.filter((a) => a.subjectId === subjectId && a.classId === classId).map((a) => a.staffId),
  );
  const teacherOptions = eligibleTeacherIds.size > 0 ? teachers.filter((t) => eligibleTeacherIds.has(t.id)) : teachers;

  const day = context && DAY_DEFINITIONS.find((d) => d.value === context.dayOfWeek);
  const period = context && PERIOD_DEFINITIONS.find((p) => p.periodNumber === context.periodNumber);

  return (
    <Dialog open={Boolean(context)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {day?.label} &middot; {period?.label}
          </DialogTitle>
          <DialogDescription>Assign a subject, teacher, and room for this period.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Select value={subjectId} onValueChange={(v) => setSubjectId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Teacher</Label>
            <Select value={staffId} onValueChange={(v) => setStaffId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {teacherOptions.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Room</Label>
            <Select value={roomId} onValueChange={(v) => setRoomId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select room" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>None</SelectItem>
                {rooms.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={() => onClear()} disabled={submitting}>
            Clear
          </Button>
          <Button
            type="button"
            disabled={submitting}
            onClick={() =>
              onSave({
                subjectId: subjectId === NONE ? undefined : subjectId,
                staffId: staffId === NONE ? undefined : staffId,
                room: roomId === NONE ? undefined : roomId,
              })
            }
          >
            {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
