import { listClasses, listSections, listSubjects } from "@/features/academics/api";
import type { SchoolClass, Section, Subject } from "@/features/academics/types";
import { listSubjectAssignments } from "@/features/teachers/api";
import type { TeacherSubjectAssignment } from "@/features/teachers/types";
import { mockDelay } from "@/utils/mockDelay";
import { DAY_DEFINITIONS, TEACHING_PERIODS, dateToDayOfWeek } from "./constants";
import { SEED_ROOMS, SEED_TIMETABLE_SECTION_IDS } from "./mock";
import type {
  DayOfWeek,
  Room,
  RoomFormValues,
  SlotAssignmentValues,
  SubstitutionFormValues,
  TimetableSlot,
  TimetableSubstitution,
} from "./types";

const ROOMS_KEY = "sms-mock-rooms";
const SLOTS_KEY = "sms-mock-timetable-slots";
const SUBSTITUTIONS_KEY = "sms-mock-timetable-substitutions";
const SEEDED_KEY = "sms-mock-timetable-seeded";

function loadJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to fallback
  }
  return fallback;
}

function saveJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // best-effort only
  }
}

function genId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

let rooms = loadJson<Room[]>(ROOMS_KEY, []);
let slots = loadJson<TimetableSlot[]>(SLOTS_KEY, []);
let substitutions = loadJson<TimetableSubstitution[]>(SUBSTITUTIONS_KEY, []);

const persistRooms = () => saveJson(ROOMS_KEY, rooms);
const persistSlots = () => saveJson(SLOTS_KEY, slots);
const persistSubstitutions = () => saveJson(SUBSTITUTIONS_KEY, substitutions);

function requireEntity<T extends { id: string }>(list: T[], id: string, label: string): T {
  const found = list.find((item) => item.id === id);
  if (!found) throw new Error(`${label} not found`);
  return found;
}

/**
 * Naive greedy fill: for each day, walks the teaching periods in order and assigns the first
 * eligible subject (by the class's subject list) that hasn't already been used that day, paired
 * with the first teacher assigned to that subject+class. It does not check teacher availability
 * across other sections, room capacity, or subject weekly-hour quotas — it's a rough starting
 * draft for an admin to review, not a real timetable constraint solver.
 */
function buildDraftSlots(
  section: Section,
  schoolClass: SchoolClass,
  eligibleSubjects: Subject[],
  assignments: TeacherSubjectAssignment[],
  existingSlots: TimetableSlot[],
): TimetableSlot[] {
  const created: TimetableSlot[] = [];
  for (const day of DAY_DEFINITIONS) {
    const subjectsScheduledToday = new Set(
      existingSlots
        .filter((s) => s.sectionId === section.id && s.dayOfWeek === day.value && s.subjectId)
        .map((s) => s.subjectId as string),
    );
    for (const period of TEACHING_PERIODS) {
      const alreadyFilled = existingSlots.some(
        (s) => s.sectionId === section.id && s.dayOfWeek === day.value && s.periodNumber === period.periodNumber,
      );
      if (alreadyFilled) continue;
      const subject = eligibleSubjects.find((s) => !subjectsScheduledToday.has(s.id));
      if (!subject) continue;
      const assignment = assignments.find((a) => a.subjectId === subject.id && a.classId === schoolClass.id);
      created.push({
        id: genId("slot"),
        sectionId: section.id,
        dayOfWeek: day.value,
        periodNumber: period.periodNumber,
        subjectId: subject.id,
        staffId: assignment?.staffId,
      });
      subjectsScheduledToday.add(subject.id);
    }
  }
  return created;
}

/**
 * One-time seed that layers demo rooms, weekly timetables, and substitutions on top of the
 * academics/teachers modules using only their public APIs, so those feature folders never need
 * a direct edit for mock data purposes.
 */
async function performSeed(): Promise<void> {
  if (loadJson(SEEDED_KEY, false)) return;

  if (rooms.length === 0) {
    rooms = SEED_ROOMS.map((r) => ({ ...r }));
    persistRooms();
  }

  const [sections, classes, subjects, assignments] = await Promise.all([
    listSections(),
    listClasses(),
    listSubjects(),
    listSubjectAssignments(),
  ]);

  for (const sectionId of SEED_TIMETABLE_SECTION_IDS) {
    const section = sections.find((s) => s.id === sectionId);
    const schoolClass = section && classes.find((c) => c.id === section.classId);
    if (!section || !schoolClass) continue;
    const eligibleSubjects = subjects.filter((s) => s.classIds.includes(schoolClass.id));
    const created = buildDraftSlots(section, schoolClass, eligibleSubjects, assignments, slots);
    slots = [...slots, ...created];
  }
  persistSlots();

  if (substitutions.length === 0) {
    const seededSubs: TimetableSubstitution[] = [];
    const staffedSlots = slots.filter((s) => s.staffId);
    const distinctTeacherIds = [...new Set(staffedSlots.map((s) => s.staffId as string))];
    const primarySlot = staffedSlots[0];
    const otherTeacherId = distinctTeacherIds.find((id) => id !== primarySlot?.staffId) ?? distinctTeacherIds[0];
    if (primarySlot && otherTeacherId) {
      seededSubs.push({
        id: genId("sub"),
        date: new Date().toISOString().slice(0, 10),
        sectionId: primarySlot.sectionId,
        dayOfWeek: primarySlot.dayOfWeek,
        periodNumber: primarySlot.periodNumber,
        originalStaffId: primarySlot.staffId,
        substituteStaffId: otherTeacherId,
        reason: "Original teacher on approved leave",
      });
    }
    const secondSlot = staffedSlots.find((s) => s.id !== primarySlot?.id);
    if (secondSlot && otherTeacherId && otherTeacherId !== secondSlot.staffId) {
      seededSubs.push({
        id: genId("sub"),
        date: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
        sectionId: secondSlot.sectionId,
        dayOfWeek: secondSlot.dayOfWeek,
        periodNumber: secondSlot.periodNumber,
        originalStaffId: secondSlot.staffId,
        substituteStaffId: otherTeacherId,
        reason: "Medical leave",
      });
    }
    if (seededSubs.length) {
      substitutions = [...substitutions, ...seededSubs];
      persistSubstitutions();
    }
  }

  saveJson(SEEDED_KEY, true);
}

const seedPromise: Promise<void> = performSeed().catch((err) => {
  console.error("Failed to seed timetable mock data", err);
});

// ── Rooms ────────────────────────────────────────────────────────────────

export async function listRooms(): Promise<Room[]> {
  await seedPromise;
  return mockDelay([...rooms], 300);
}

export async function createRoom(values: RoomFormValues): Promise<Room> {
  await seedPromise;
  const room: Room = { id: genId("room"), ...values };
  rooms = [room, ...rooms];
  persistRooms();
  return mockDelay(room, 350);
}

export async function updateRoom(id: string, values: RoomFormValues): Promise<Room> {
  await seedPromise;
  requireEntity(rooms, id, "Room");
  rooms = rooms.map((r) => (r.id === id ? { ...r, ...values } : r));
  persistRooms();
  return mockDelay(requireEntity(rooms, id, "Room"), 350);
}

export async function deleteRoom(id: string): Promise<void> {
  await seedPromise;
  requireEntity(rooms, id, "Room");
  rooms = rooms.filter((r) => r.id !== id);
  persistRooms();
  return mockDelay(undefined, 300);
}

// ── Timetable slots ──────────────────────────────────────────────────────

export async function listSlots(filter?: { sectionId?: string; staffId?: string }): Promise<TimetableSlot[]> {
  await seedPromise;
  let result = [...slots];
  if (filter?.sectionId) result = result.filter((s) => s.sectionId === filter.sectionId);
  if (filter?.staffId) result = result.filter((s) => s.staffId === filter.staffId);
  return mockDelay(result, 300);
}

export async function assignSlot(values: SlotAssignmentValues): Promise<TimetableSlot> {
  await seedPromise;
  const existing = slots.find(
    (s) => s.sectionId === values.sectionId && s.dayOfWeek === values.dayOfWeek && s.periodNumber === values.periodNumber,
  );
  let saved: TimetableSlot;
  if (existing) {
    saved = { ...existing, subjectId: values.subjectId, staffId: values.staffId, room: values.room };
    slots = slots.map((s) => (s.id === existing.id ? saved : s));
  } else {
    saved = { id: genId("slot"), ...values };
    slots = [...slots, saved];
  }
  persistSlots();
  return mockDelay(saved, 350);
}

export async function clearSlot(sectionId: string, dayOfWeek: DayOfWeek, periodNumber: number): Promise<void> {
  await seedPromise;
  slots = slots.filter((s) => !(s.sectionId === sectionId && s.dayOfWeek === dayOfWeek && s.periodNumber === periodNumber));
  persistSlots();
  return mockDelay(undefined, 300);
}

/** Returns the conflicting slot (a different section, same teacher/day/period), if any. Used for a soft warning, not a hard block. */
export function findTeacherConflict(
  allSlots: TimetableSlot[],
  staffId: string,
  dayOfWeek: DayOfWeek,
  periodNumber: number,
  excludeSectionId: string,
): TimetableSlot | null {
  return (
    allSlots.find(
      (s) => s.staffId === staffId && s.dayOfWeek === dayOfWeek && s.periodNumber === periodNumber && s.sectionId !== excludeSectionId,
    ) ?? null
  );
}

export async function autoGenerateSectionTimetable(sectionId: string): Promise<TimetableSlot[]> {
  await seedPromise;
  const [sections, classes, subjects, assignments] = await Promise.all([
    listSections(),
    listClasses(),
    listSubjects(),
    listSubjectAssignments(),
  ]);
  const section = requireEntity(sections, sectionId, "Section");
  const schoolClass = classes.find((c) => c.id === section.classId);
  if (!schoolClass) throw new Error("Class not found for section");
  const eligibleSubjects = subjects.filter((s) => s.classIds.includes(schoolClass.id));
  const created = buildDraftSlots(section, schoolClass, eligibleSubjects, assignments, slots);
  slots = [...slots, ...created];
  persistSlots();
  return mockDelay(slots.filter((s) => s.sectionId === sectionId), 500);
}

// ── Substitutions ────────────────────────────────────────────────────────

export async function listSubstitutions(): Promise<TimetableSubstitution[]> {
  await seedPromise;
  return mockDelay([...substitutions], 300);
}

export async function createSubstitution(values: SubstitutionFormValues): Promise<TimetableSubstitution> {
  await seedPromise;
  const dayOfWeek = dateToDayOfWeek(values.date);
  if (dayOfWeek === null) {
    await mockDelay(null, 300);
    throw new Error("Selected date falls on a Sunday; there are no periods to substitute.");
  }
  const originalSlot = slots.find(
    (s) => s.sectionId === values.sectionId && s.dayOfWeek === dayOfWeek && s.periodNumber === values.periodNumber,
  );
  const substitution: TimetableSubstitution = {
    id: genId("sub"),
    date: values.date,
    sectionId: values.sectionId,
    dayOfWeek,
    periodNumber: values.periodNumber,
    originalStaffId: originalSlot?.staffId,
    substituteStaffId: values.substituteStaffId,
    reason: values.reason,
  };
  substitutions = [substitution, ...substitutions];
  persistSubstitutions();
  return mockDelay(substitution, 400);
}

export async function deleteSubstitution(id: string): Promise<void> {
  await seedPromise;
  substitutions = substitutions.filter((s) => s.id !== id);
  persistSubstitutions();
  return mockDelay(undefined, 300);
}
