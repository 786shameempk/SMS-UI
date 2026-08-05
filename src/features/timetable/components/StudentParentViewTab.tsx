import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { listCalendarEvents, listClasses, listSections, listSubjects } from "@/features/academics/api";
import { listTeachers } from "@/features/teachers/api";
import { listRooms, listSlots } from "../api";
import { DAY_DEFINITIONS, holidayForDayThisWeek } from "../constants";
import type { DayOfWeek } from "../types";
import SectionScheduleGrid from "./SectionScheduleGrid";

export default function StudentParentViewTab() {
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: sections = [] } = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers", "directory"], queryFn: listTeachers });
  const { data: rooms = [] } = useQuery({ queryKey: ["timetable", "rooms"], queryFn: listRooms });
  const { data: calendarEvents = [] } = useQuery({ queryKey: ["academics", "calendar-events"], queryFn: listCalendarEvents });
  const { data: allSlots = [] } = useQuery({ queryKey: ["timetable", "slots"], queryFn: () => listSlots() });

  const [sectionId, setSectionId] = useState("");
  const activeSectionId = sectionId || sections[0]?.id || "";
  const slots = allSlots.filter((s) => s.sectionId === activeSectionId);

  const holidayDays = useMemo(() => {
    const days = new Set<DayOfWeek>();
    for (const day of DAY_DEFINITIONS) {
      if (holidayForDayThisWeek(calendarEvents, day.value)) days.add(day.value);
    }
    return days;
  }, [calendarEvents]);

  return (
    <div className="space-y-4">
      <Select value={activeSectionId} onValueChange={setSectionId}>
        <SelectTrigger className="w-56">
          <SelectValue placeholder="Select section" />
        </SelectTrigger>
        <SelectContent>
          {sections.map((s) => {
            const className = classes.find((c) => c.id === s.classId)?.name ?? "";
            return (
              <SelectItem key={s.id} value={s.id}>
                {className} - {s.name}
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>

      <p className="text-xs text-muted-foreground">Read-only view. Contact the school office for schedule changes.</p>

      <SectionScheduleGrid slots={slots} subjects={subjects} teachers={teachers} rooms={rooms} holidayDays={holidayDays} />
    </div>
  );
}
