import { academicHttpClient, extractApiErrorMessage } from "@/lib/httpClient";
import type {
  DayOfWeek,
  Room,
  RoomFormValues,
  SlotAssignmentValues,
  SubstitutionFormValues,
  TimetableSlot,
  TimetableSubstitution,
} from "./types";

// ── API response shapes (AcademicService DTOs) ──────────────────────────────

interface ApiRoom {
  id: string;
  tenantId: string;
  branchId: string;
  name: string;
  capacity: number;
}

interface ApiTimetableSlot {
  id: string;
  tenantId: string;
  branchId: string;
  sectionId: string;
  dayOfWeek: number;
  periodNumber: number;
  subjectId: string | null;
  staffId: string | null;
  room: string | null;
  isBreak: boolean;
}

interface ApiTimetableSubstitution {
  id: string;
  tenantId: string;
  branchId: string;
  date: string;
  sectionId: string;
  dayOfWeek: number;
  periodNumber: number;
  originalStaffId: string | null;
  substituteStaffId: string;
  reason: string | null;
}

// ── Mappers ──────────────────────────────────────────────────────────────────

const mapRoom = (dto: ApiRoom): Room => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  name: dto.name,
  capacity: dto.capacity,
});

const mapSlot = (dto: ApiTimetableSlot): TimetableSlot => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  sectionId: dto.sectionId,
  dayOfWeek: dto.dayOfWeek as DayOfWeek,
  periodNumber: dto.periodNumber,
  subjectId: dto.subjectId ?? undefined,
  staffId: dto.staffId ?? undefined,
  room: dto.room ?? undefined,
  isBreak: dto.isBreak,
});

const mapSubstitution = (dto: ApiTimetableSubstitution): TimetableSubstitution => ({
  id: dto.id,
  tenantId: dto.tenantId,
  branchId: dto.branchId,
  date: dto.date,
  sectionId: dto.sectionId,
  dayOfWeek: dto.dayOfWeek as DayOfWeek,
  periodNumber: dto.periodNumber,
  originalStaffId: dto.originalStaffId ?? undefined,
  substituteStaffId: dto.substituteStaffId,
  reason: dto.reason ?? undefined,
});

async function unwrap<T>(request: Promise<{ data: T }>): Promise<T> {
  try {
    return (await request).data;
  } catch (err) {
    throw new Error(extractApiErrorMessage(err));
  }
}

// ── Rooms ────────────────────────────────────────────────────────────────

export async function listRooms(): Promise<Room[]> {
  const rooms = await unwrap(academicHttpClient.get<ApiRoom[]>("/api/rooms"));
  return rooms.map(mapRoom);
}

export async function createRoom(values: RoomFormValues): Promise<Room> {
  const room = await unwrap(academicHttpClient.post<ApiRoom>("/api/rooms", values));
  return mapRoom(room);
}

export async function updateRoom(id: string, values: RoomFormValues): Promise<Room> {
  const room = await unwrap(academicHttpClient.put<ApiRoom>(`/api/rooms/${id}`, values));
  return mapRoom(room);
}

export async function deleteRoom(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/rooms/${id}`));
}

// ── Timetable slots ──────────────────────────────────────────────────────

export async function listSlots(filter?: { sectionId?: string; staffId?: string }): Promise<TimetableSlot[]> {
  const slots = await unwrap(
    academicHttpClient.get<ApiTimetableSlot[]>("/api/timetable/slots", {
      params: { sectionId: filter?.sectionId, staffId: filter?.staffId },
    }),
  );
  return slots.map(mapSlot);
}

export async function assignSlot(values: SlotAssignmentValues): Promise<TimetableSlot> {
  const slot = await unwrap(
    academicHttpClient.post<ApiTimetableSlot>("/api/timetable/slots", {
      sectionId: values.sectionId,
      dayOfWeek: values.dayOfWeek,
      periodNumber: values.periodNumber,
      subjectId: values.subjectId ?? null,
      staffId: values.staffId ?? null,
      room: values.room ?? null,
    }),
  );
  return mapSlot(slot);
}

export async function clearSlot(sectionId: string, dayOfWeek: DayOfWeek, periodNumber: number): Promise<void> {
  await unwrap(
    academicHttpClient.delete<void>("/api/timetable/slots", { params: { sectionId, dayOfWeek, periodNumber } }),
  );
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
  const slots = await unwrap(
    academicHttpClient.post<ApiTimetableSlot[]>(`/api/timetable/sections/${sectionId}/auto-generate`, {}),
  );
  return slots.map(mapSlot);
}

// ── Substitutions ────────────────────────────────────────────────────────

export async function listSubstitutions(): Promise<TimetableSubstitution[]> {
  const substitutions = await unwrap(academicHttpClient.get<ApiTimetableSubstitution[]>("/api/timetable/substitutions"));
  return substitutions.map(mapSubstitution);
}

export async function createSubstitution(values: SubstitutionFormValues): Promise<TimetableSubstitution> {
  const substitution = await unwrap(
    academicHttpClient.post<ApiTimetableSubstitution>("/api/timetable/substitutions", {
      date: values.date,
      sectionId: values.sectionId,
      periodNumber: values.periodNumber,
      substituteStaffId: values.substituteStaffId,
      reason: values.reason ?? null,
    }),
  );
  return mapSubstitution(substitution);
}

export async function deleteSubstitution(id: string): Promise<void> {
  await unwrap(academicHttpClient.delete<void>(`/api/timetable/substitutions/${id}`));
}
