import type { Subject } from "@/features/academics/types";
import type { StaffMember } from "@/features/staff/types";
import type { DayOfWeek, Room, TimetableSlot } from "../types";
import TimetableGrid from "./TimetableGrid";

/** The weekly grid for one section's slots. Shared by the editable Class/Section View and the read-only Student/Parent View. */
export default function SectionScheduleGrid({
  slots,
  subjects,
  teachers,
  rooms,
  holidayDays,
  onCellClick,
}: {
  slots: TimetableSlot[];
  subjects: Subject[];
  teachers: StaffMember[];
  rooms: Room[];
  holidayDays: Set<DayOfWeek>;
  onCellClick?: (dayOfWeek: DayOfWeek, periodNumber: number, slot: TimetableSlot | undefined) => void;
}) {
  return (
    <TimetableGrid
      slots={slots}
      holidayDays={holidayDays}
      onCellClick={onCellClick}
      renderCell={(slot) => {
        if (!slot?.subjectId) return <span className="text-xs text-muted-foreground">{onCellClick ? "+ Add" : "Free"}</span>;
        const subject = subjects.find((s) => s.id === slot.subjectId);
        const teacher = teachers.find((t) => t.id === slot.staffId);
        const room = rooms.find((r) => r.id === slot.room);
        return (
          <div>
            <p className="text-sm font-medium text-foreground">{subject?.name ?? "Subject"}</p>
            <p className="text-xs text-muted-foreground">{teacher ? `${teacher.firstName} ${teacher.lastName}` : "No teacher"}</p>
            {room && <p className="text-xs text-muted-foreground">{room.name}</p>}
          </div>
        );
      }}
    />
  );
}
