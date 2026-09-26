import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listClasses, listSections, listSubjects } from "@/features/academics/api";
import type { Section, SchoolClass } from "@/features/academics/types";
import { listTeachers } from "@/features/teachers/api";
import { listRooms, listSlots } from "../api";
import TimetableGrid from "./TimetableGrid";

function sectionFullLabel(section: Section | undefined, classes: SchoolClass[]): string {
  if (!section) return "Unknown section";
  const className = classes.find((c) => c.id === section.classId)?.name ?? "";
  return `${className} - ${section.name}`;
}

export default function TeacherViewTab() {
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers", "directory"], queryFn: listTeachers });
  const { data: sections = [] } = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: rooms = [] } = useQuery({ queryKey: ["timetable", "rooms"], queryFn: listRooms });
  const { data: allSlots = [] } = useQuery({ queryKey: ["timetable", "slots"], queryFn: () => listSlots() });

  const [staffId, setStaffId] = useState<string>("");
  const activeStaffId = staffId || teachers[0]?.id || "";
  const slots = allSlots.filter((s) => s.staffId === activeStaffId);

  return (
    <div className="space-y-4">
      <Select value={activeStaffId} onValueChange={setStaffId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Select teacher" />
        </SelectTrigger>
        <SelectContent>
          {teachers.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {t.firstName} {t.lastName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {!activeStaffId ? (
        <p className="text-sm text-muted-foreground">No teachers found.</p>
      ) : (
        <TimetableGrid
          slots={slots}
          renderCell={(slot) => {
            if (!slot?.subjectId) return <span className="text-xs text-muted-foreground">Free</span>;
            const subject = subjects.find((s) => s.id === slot.subjectId);
            const section = sections.find((s) => s.id === slot.sectionId);
            const room = rooms.find((r) => r.id === slot.room);
            return (
              <div>
                <p className="text-sm font-medium text-foreground">{subject?.name ?? "Subject"}</p>
                <p className="text-xs text-muted-foreground">{sectionFullLabel(section, classes)}</p>
                {room && <p className="text-xs text-muted-foreground">{room.name}</p>}
              </div>
            );
          }}
        />
      )}
    </div>
  );
}
