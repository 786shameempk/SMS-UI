import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { listCalendarEvents, listClasses, listSections, listSubjects } from "@/features/academics/api";
import type { Section, SchoolClass, Subject } from "@/features/academics/types";
import { listSubjectAssignments, listTeachers } from "@/features/teachers/api";
import type { StaffMember } from "@/features/staff/types";
import { assignSlot, autoGenerateSectionTimetable, clearSlot, findTeacherConflict, listRooms, listSlots } from "../api";
import { DAY_DEFINITIONS, holidayForDayThisWeek } from "../constants";
import type { DayOfWeek, TimetableSlot } from "../types";
import SectionScheduleGrid from "./SectionScheduleGrid";
import SlotEditorDialog, { type SlotEditorContext } from "./SlotEditorDialog";
import TimetableGrid from "./TimetableGrid";

function sectionFullLabel(section: Section | undefined, classes: { id: string; name: string }[]): string {
  if (!section) return "Unknown section";
  const className = classes.find((c) => c.id === section.classId)?.name ?? "";
  return `${className} - ${section.name}`;
}

export default function ClassSectionViewTab() {
  const queryClient = useQueryClient();
  const { data: classes = [] } = useQuery({ queryKey: ["academics", "classes"], queryFn: listClasses });
  const { data: sections = [] } = useQuery({ queryKey: ["academics", "sections"], queryFn: listSections });
  const { data: subjects = [] } = useQuery({ queryKey: ["academics", "subjects"], queryFn: listSubjects });
  const { data: calendarEvents = [] } = useQuery({ queryKey: ["academics", "calendar-events"], queryFn: listCalendarEvents });
  const { data: teachers = [] } = useQuery({ queryKey: ["teachers", "directory"], queryFn: listTeachers });
  const { data: assignments = [] } = useQuery({ queryKey: ["teachers", "subject-assignments"], queryFn: () => listSubjectAssignments() });
  const { data: rooms = [] } = useQuery({ queryKey: ["timetable", "rooms"], queryFn: listRooms });
  const { data: allSlots = [] } = useQuery({ queryKey: ["timetable", "slots"], queryFn: () => listSlots() });

  const [viewBy, setViewBy] = useState<"section" | "room">("section");
  const [classId, setClassId] = useState<string>("");
  const [sectionId, setSectionId] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [editorContext, setEditorContext] = useState<SlotEditorContext | null>(null);

  const activeClassId = classId || classes[0]?.id || "";
  const effectiveSections = sections.filter((s) => s.classId === activeClassId);
  const activeSectionId = sectionId || effectiveSections[0]?.id || "";
  const activeRoomId = roomId || rooms[0]?.id || "";

  const holidayDays = useMemo(() => {
    const days = new Set<DayOfWeek>();
    for (const day of DAY_DEFINITIONS) {
      if (holidayForDayThisWeek(calendarEvents, day.value)) days.add(day.value);
    }
    return days;
  }, [calendarEvents]);

  const invalidateSlots = () => queryClient.invalidateQueries({ queryKey: ["timetable", "slots"] });

  const saveMutation = useMutation({
    mutationFn: assignSlot,
    onSuccess: (saved) => {
      invalidateSlots();
      if (saved.staffId) {
        const conflict = findTeacherConflict(allSlots, saved.staffId, saved.dayOfWeek, saved.periodNumber, saved.sectionId);
        if (conflict) {
          const conflictSection = sections.find((s) => s.id === conflict.sectionId);
          toast(`Teacher is already scheduled for ${sectionFullLabel(conflictSection, classes)} at this time.`, { icon: "⚠️" });
        }
      }
      toast.success("Slot updated");
      setEditorContext(null);
    },
  });

  const clearMutation = useMutation({
    mutationFn: ({ sectionId: sid, dayOfWeek, periodNumber }: { sectionId: string; dayOfWeek: DayOfWeek; periodNumber: number }) =>
      clearSlot(sid, dayOfWeek, periodNumber),
    onSuccess: () => {
      invalidateSlots();
      toast.success("Slot cleared");
      setEditorContext(null);
    },
  });

  const autoGenerateMutation = useMutation({
    mutationFn: autoGenerateSectionTimetable,
    onSuccess: () => {
      invalidateSlots();
      toast.success("Draft timetable generated. Review and adjust manually before publishing.");
    },
  });

  const sectionSlots = allSlots.filter((s) => s.sectionId === activeSectionId);
  const roomSlots = allSlots.filter((s) => s.room === activeRoomId);
  const eligibleSubjects = subjects.filter((s) => s.classIds.includes(activeClassId));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={viewBy} onValueChange={(v) => setViewBy(v as "section" | "room")}>
          <TabsList>
            <TabsTrigger value="section">By section</TabsTrigger>
            <TabsTrigger value="room">By room</TabsTrigger>
          </TabsList>
        </Tabs>

        {viewBy === "section" ? (
          <div className="flex items-center gap-2">
            <Select
              value={activeClassId}
              onValueChange={(v) => {
                setClassId(v);
                setSectionId("");
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={activeSectionId} onValueChange={setSectionId}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Section" />
              </SelectTrigger>
              <SelectContent>
                {effectiveSections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              disabled={!activeSectionId || autoGenerateMutation.isPending}
              onClick={() => activeSectionId && autoGenerateMutation.mutate(activeSectionId)}
            >
              <Sparkles className="w-4 h-4" />
              Auto-generate draft
            </Button>
          </div>
        ) : (
          <Select value={activeRoomId} onValueChange={setRoomId}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {viewBy === "section" ? (
        <SectionScheduleGrid
          slots={sectionSlots}
          subjects={subjects}
          teachers={teachers}
          rooms={rooms}
          holidayDays={holidayDays}
          onCellClick={(dayOfWeek, periodNumber, slot) => {
            if (!activeSectionId) return;
            setEditorContext({ sectionId: activeSectionId, dayOfWeek, periodNumber, slot });
          }}
        />
      ) : (
        <TimetableGridRoom slots={roomSlots} subjects={subjects} teachers={teachers} sections={sections} classes={classes} holidayDays={holidayDays} />
      )}

      <SlotEditorDialog
        context={editorContext}
        onOpenChange={(open) => !open && setEditorContext(null)}
        subjects={eligibleSubjects}
        teachers={teachers}
        assignments={assignments}
        classId={activeClassId}
        rooms={rooms}
        submitting={saveMutation.isPending || clearMutation.isPending}
        onSave={async (values) => {
          if (!editorContext) return;
          await saveMutation.mutateAsync({
            sectionId: editorContext.sectionId,
            dayOfWeek: editorContext.dayOfWeek,
            periodNumber: editorContext.periodNumber,
            ...values,
          });
        }}
        onClear={async () => {
          if (!editorContext) return;
          await clearMutation.mutateAsync({
            sectionId: editorContext.sectionId,
            dayOfWeek: editorContext.dayOfWeek,
            periodNumber: editorContext.periodNumber,
          });
        }}
      />
    </div>
  );
}

function TimetableGridRoom({
  slots,
  subjects,
  teachers,
  sections,
  classes,
  holidayDays,
}: {
  slots: TimetableSlot[];
  subjects: Subject[];
  teachers: StaffMember[];
  sections: Section[];
  classes: SchoolClass[];
  holidayDays: Set<DayOfWeek>;
}) {
  return (
    <TimetableGrid
      slots={slots}
      holidayDays={holidayDays}
      renderCell={(slot) => {
        if (!slot?.subjectId) return <span className="text-xs text-muted-foreground">Free</span>;
        const subject = subjects.find((s) => s.id === slot.subjectId);
        const teacher = teachers.find((t) => t.id === slot.staffId);
        const section = sections.find((s) => s.id === slot.sectionId);
        return (
          <div>
            <p className="text-sm font-medium text-foreground">{sectionFullLabel(section, classes)}</p>
            <p className="text-xs text-muted-foreground">{subject?.name ?? "Subject"}</p>
            <p className="text-xs text-muted-foreground">{teacher ? `${teacher.firstName} ${teacher.lastName}` : "No teacher"}</p>
          </div>
        );
      }}
    />
  );
}
